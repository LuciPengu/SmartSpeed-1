import os
import stripe
import httpx
from datetime import datetime, timedelta

def check_subscription_access(user) -> bool:
    """Check if user has an active subscription or is in trial period"""
    if not user:
        return False
    
    status = getattr(user, 'subscription_status', None) or 'none'
    trial_ends_at = getattr(user, 'trial_ends_at', None)
    
    if status in ['active', 'trialing']:
        return True
    
    if trial_ends_at and trial_ends_at > datetime.utcnow():
        return True
    
    return False

async def get_stripe_credentials():
    """Fetch Stripe credentials from Replit connection API"""
    hostname = os.environ.get('REPLIT_CONNECTORS_HOSTNAME')
    repl_identity = os.environ.get('REPL_IDENTITY')
    web_renewal = os.environ.get('WEB_REPL_RENEWAL')
    
    if repl_identity:
        x_replit_token = f'repl {repl_identity}'
    elif web_renewal:
        x_replit_token = f'depl {web_renewal}'
    else:
        raise Exception('X_REPLIT_TOKEN not found')
    
    is_production = os.environ.get('REPLIT_DEPLOYMENT') == '1'
    target_environment = 'production' if is_production else 'development'
    
    url = f"https://{hostname}/api/v2/connection"
    params = {
        'include_secrets': 'true',
        'connector_names': 'stripe',
        'environment': target_environment
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            params=params,
            headers={
                'Accept': 'application/json',
                'X_REPLIT_TOKEN': x_replit_token
            }
        )
        data = response.json()
    
    connection = data.get('items', [{}])[0]
    settings = connection.get('settings', {})
    
    if not settings.get('publishable') or not settings.get('secret'):
        raise Exception(f'Stripe {target_environment} connection not found')
    
    return {
        'publishable_key': settings['publishable'],
        'secret_key': settings['secret']
    }

async def get_stripe_client():
    """Get configured Stripe client"""
    credentials = await get_stripe_credentials()
    stripe.api_key = credentials['secret_key']
    return stripe

async def get_publishable_key():
    """Get Stripe publishable key for frontend"""
    credentials = await get_stripe_credentials()
    return credentials['publishable_key']

HITSMART_PRICE_ID = None

async def get_or_create_subscription_product():
    """Create the Hitsmart subscription product and price if they don't exist"""
    global HITSMART_PRICE_ID
    
    stripe_client = await get_stripe_client()
    
    products = stripe_client.Product.search(query="name:'Hitsmart Pro'")
    
    if products.data:
        product = products.data[0]
        prices = stripe_client.Price.list(product=product.id, active=True)
        if prices.data:
            HITSMART_PRICE_ID = prices.data[0].id
            return {'product_id': product.id, 'price_id': HITSMART_PRICE_ID}
    
    product = stripe_client.Product.create(
        name='Hitsmart Pro',
        description='Monthly subscription to Hitsmart Strike Calculator - Analyze sparring footage, detect punch impacts, and get AI-powered injury risk assessments.',
        metadata={
            'app': 'hitsmart',
            'type': 'subscription'
        }
    )
    
    price = stripe_client.Price.create(
        product=product.id,
        unit_amount=999,
        currency='usd',
        recurring={'interval': 'month'},
        metadata={
            'trial_days': '7'
        }
    )
    
    HITSMART_PRICE_ID = price.id
    
    return {'product_id': product.id, 'price_id': price.id}

async def create_checkout_session(user_id: str, email: str, customer_id: str = None, return_url: str = None):
    """Create a Stripe checkout session for subscription with 7-day trial"""
    stripe_client = await get_stripe_client()
    
    if not HITSMART_PRICE_ID:
        await get_or_create_subscription_product()
    
    if not customer_id:
        customer = stripe_client.Customer.create(
            email=email,
            metadata={'user_id': user_id}
        )
        customer_id = customer.id
    
    session = stripe_client.checkout.Session.create(
        customer=customer_id,
        payment_method_types=['card'],
        line_items=[{
            'price': HITSMART_PRICE_ID,
            'quantity': 1
        }],
        mode='subscription',
        subscription_data={
            'trial_period_days': 7,
            'metadata': {'user_id': user_id}
        },
        success_url=f"{return_url}?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{return_url}?checkout=cancelled",
        metadata={'user_id': user_id}
    )
    
    return {'session_id': session.id, 'url': session.url, 'customer_id': customer_id}

async def create_customer_portal_session(customer_id: str, return_url: str):
    """Create a customer portal session for subscription management"""
    stripe_client = await get_stripe_client()
    
    session = stripe_client.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url
    )
    
    return {'url': session.url}

async def get_subscription_status(subscription_id: str):
    """Get subscription status from Stripe"""
    stripe_client = await get_stripe_client()
    
    try:
        subscription = stripe_client.Subscription.retrieve(subscription_id)
        return {
            'status': subscription.status,
            'trial_end': datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
            'current_period_end': datetime.fromtimestamp(subscription.current_period_end),
            'cancel_at_period_end': subscription.cancel_at_period_end
        }
    except Exception as e:
        return None

async def construct_webhook_event(payload: bytes, sig_header: str):
    """Construct and verify webhook event"""
    stripe_client = await get_stripe_client()
    
    credentials = await get_stripe_credentials()
    
    webhooks = stripe_client.WebhookEndpoint.list(limit=10)
    webhook_secret = None
    
    for wh in webhooks.data:
        if 'hitsmart' in wh.url.lower() or 'replit' in wh.url.lower():
            webhook_secret = wh.get('secret')
            break
    
    if not webhook_secret:
        event = stripe_client.Event.construct_from(
            stripe_client.util.json.loads(payload),
            stripe_client.api_key
        )
        return event
    
    event = stripe_client.Webhook.construct_event(
        payload, sig_header, webhook_secret
    )
    return event
