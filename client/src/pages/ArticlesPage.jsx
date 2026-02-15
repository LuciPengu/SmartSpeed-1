import { useState } from 'react';

const articles = [
  {
    id: 1,
    title: 'Phantom Concussions',
    subtitle: 'Why You Feel "Foggy" After Light Sparring',
    simple: {
      intro: 'In boxing and MMA, we usually only worry when someone gets dropped or wobbled. But many fighters feel "foggy," get headaches, or lose focus after sessions where they only took light jabs. This isn\'t just in your head — it\'s a physiological "perfect storm." Here\'s why you feel like you have a concussion even when you weren\'t hit hard.',
      sections: [
        {
          heading: '1. Your Neck is Much Weaker Than Your Brain',
          content: 'Your neck is the most overlooked part of your "chin." The brain usually needs about 70–120g of force to sustain a concussion, but the neck can be injured at just 4.5g of force. This means you can injure your neck without injuring your brain. Because the nerves in your neck and head are connected, your brain can\'t tell the difference — an injured neck can feel almost exactly like a concussion, causing headaches, dizziness, and cognitive fog.'
        },
        {
          heading: '2. The Brain\'s "Parking Brake" (GABA)',
          content: 'When you take repetitive light hits, your brain tries to protect itself by releasing a chemical called GABA — think of it as your brain\'s "brakes." It slows down your reaction time, makes your hands feel heavy, and causes mental fog and memory issues. Research from the University of Stirling (Di Virgilio et al., 2019) shows this "brake" stays on for about 24 hours after sparring. If you spar every day, your brain never gets the chance to take the brakes off.'
        },
        {
          heading: '3. No Spar After Suspected Concussion',
          content: 'Your brain uses a specific energy molecule called NAA (N-acetylaspartate). After a concussion, brain energy levels drop dramatically. While many athletes feel fine within a week, brain scans show it takes a full 30 days for NAA to return to baseline (Vagnozzi et al., 2008). If you take "light bumps" while your energy is already low, you aren\'t just training — you\'re digging a deeper hole that can lead to permanent damage.'
        },
        {
          heading: '4. The Adrenaline Crash',
          content: 'Sometimes the fog isn\'t from the hits at all — it\'s from the adrenaline dump. During a hard session, your body is flooded with stress hormones (adrenaline and cortisol). When you stop, levels plummet rapidly. This "crash" causes shaking, tremors, nausea, extreme tiredness, and mental slowness that can mimic concussion symptoms almost perfectly.'
        },
        {
          heading: '5. Your Eyes and Balance Get Out of Sync',
          content: 'Your eyes, inner ear, and neck all work together to keep your vision steady while you move. Light hits can "de-sync" these systems. When your eyes are even slightly off, your brain has to work 10x harder just to process what you\'re seeing. This overheating of the visual processing system feels like cognitive fatigue or fog, and your reaction time slows because you can\'t track punches as clearly.'
        }
      ],
      summary: {
        title: 'Summary for the Gym',
        points: [
          'The Fog is Real: If you feel foggy, your brain or neck is telling you it\'s overloaded.',
          'Respect the Neck: Addressing neck strength can reduce "phantom" symptoms significantly.',
          '30-Day Rule: Don\'t spar hard for 30 days after a suspected concussion — your brain\'s battery takes 30 days to fully recharge.',
          'Hydrate: Dehydration shrinks the fluid around your brain, making every light bump feel much heavier.'
        ]
      }
    },
    deepDive: 'The "phantom concussion" is not a psychosomatic event but the result of four distinct, quantifiable biological mechanisms operating below the structural brain injury threshold. Cervicogenic pathology arises from the 15:1 disparity between cervical (4.5g) and cranial (70–120g) injury thresholds — the upper cervical spine\'s proprioceptive afferents share convergent pathways with trigeminal nuclei, producing referred cephalgia indistinguishable from post-concussive headache. Acute corticomotor inhibition, documented by Di Virgilio et al. (2019), demonstrates that subconcussive headers produce measurable increases in cortical silent period duration (reflecting enhanced GABAergic inhibition) persisting for 24+ hours, directly impairing motor cortex excitability. Autonomic dysregulation following the acute sympathoadrenal response creates a parasympathetic rebound characterized by hypotension, bradycardia, and neuroglycopenia. Finally, metabolic vulnerability windows defined by NAA depression (Vagnozzi et al., 2008) show that the neurometabolic cascade following even mild impacts creates a 22–45 day period where the brain\'s bioenergetic reserves are compromised, making subsequent impacts disproportionately dangerous. These mechanisms operate independently and synergistically, producing symptom complexes that are neurologically real despite the absence of axonal shearing or structural damage visible on conventional imaging.'
  },
  {
    id: 2,
    title: 'Creatine for Brain Protection',
    subtitle: 'Creatine as a Neuroprotective Agent',
    simple: {
      intro: 'For combat athletes, creatine isn\'t just about bigger muscles — it\'s one of the most promising neuroprotective supplements available. Your brain uses about 20% of your body\'s total ATP (energy), making it extremely vulnerable when that energy supply is disrupted by impact.',
      sections: [
        {
          heading: '1. Brain Energy and Injury',
          content: 'When your brain gets hit, it goes through a "metabolic storm" — cells get stretched, chemicals get scrambled, and the brain demands massive amounts of energy to repair itself. But right when it needs energy most, blood flow to the brain is impaired. This is the Energy Crisis of concussion. Your brain is starving for fuel while simultaneously trying to repair itself, creating a dangerous deficit that can worsen injury outcomes.'
        },
        {
          heading: '2. The Protection Shield',
          content: 'Creatine acts as a backup battery for your brain. Research shows that creatine supplementation boosts brain phosphocreatine (PCr) reserves by approximately 9%. Animal studies demonstrated that creatine reduced brain damage from impacts by up to 50% (Sullivan et al., 2000). In human trials with brain injuries, patients taking creatine saw significant reductions in headaches, dizziness, and fatigue (Sakellaris et al., 2006/2008). A 2024 study found that creatine keeps reaction time and cognitive function sharp even under sleep deprivation (Gordji-Nejad et al., 2024).'
        },
        {
          heading: '3. Dose Recommendations',
          content: 'For neuroprotection, take 3–5g of creatine monohydrate daily — no loading phase needed for long-term brain saturation. Take it with carbohydrates to improve absorption (insulin helps transport creatine). Consistency is key: the brain is harder to saturate than muscle tissue, so daily supplementation over weeks is necessary. Don\'t stop taking it before fights — that\'s like removing your seatbelt right before a car crash. Creatine is well-studied and safe for healthy kidneys in long-term use.'
        },
        {
          heading: '4. Bottom Line',
          content: 'Creatine is one of the most affordable, well-researched supplements that provides dual benefits for combat athletes: enhanced explosive power and anaerobic endurance during rounds, plus meaningful neuroprotection against the metabolic crisis that follows head impacts. Every combat athlete should consider daily creatine supplementation as a fundamental part of their nutrition strategy, not as an optional performance enhancer but as a critical safety measure.'
        }
      ]
    },
    deepDive: 'The neuroprotective mechanism of creatine operates through the phosphocreatine (PCr) shuttle system. During traumatic brain injury, the primary insult triggers a neurometabolic cascade: mechanoporation of neuronal membranes causes indiscriminate ion flux, particularly potassium efflux and calcium influx. The Na+/K+-ATPase pumps activate maximally to restore ionic homeostasis, creating an acute ATP demand that exceeds mitochondrial production capacity by 150–200%. Simultaneously, calcium-mediated mitochondrial dysfunction impairs oxidative phosphorylation, and cerebral blood flow decreases by 50–70% due to acute vasospasm. Creatine supplementation increases brain PCr reserves (verified by 31P-MRS at approximately 9% elevation), providing an immediately available phosphate donor pool that can buffer the ATP deficit during this critical window. Sullivan et al. (2000) demonstrated that creatine-loaded cortical tissue showed 50% less mitochondrial membrane potential collapse and 36% reduction in reactive oxygen species following controlled cortical impact. The blood-brain barrier presents a unique challenge: creatine transport via the SLC6A8 transporter is saturable and slow, requiring 4–6 weeks of consistent supplementation to achieve meaningful brain tissue saturation — a critical pharmacokinetic distinction from rapid muscle loading protocols.'
  },
  {
    id: 3,
    title: 'Subconcussive Impact Effects',
    subtitle: 'Every Hit Counts: The Silent Damage',
    simple: {
      intro: 'Not every damaging hit to the head results in a diagnosed concussion. Subconcussive impacts — those below the clinical concussion threshold — are increasingly recognized as a serious long-term threat to brain health in combat athletes.',
      sections: [
        {
          heading: '1. What Are Subconcussive Impacts?',
          content: 'Subconcussive impacts are hits to the head that don\'t produce immediate, obvious concussion symptoms like loss of consciousness or amnesia. They fall below the diagnostic threshold but still transmit force to the brain. In combat sports, these are the everyday jabs, hooks to the guard, and incidental head contact during grappling that fighters absorb hundreds or thousands of times throughout a career. Each individual impact may seem harmless, but the cumulative effect is anything but.'
        },
        {
          heading: '2. Cumulative Damage',
          content: 'Research has shown that repeated subconcussive impacts cause measurable breakdown of the blood-brain barrier (BBB) — the protective layer that controls what enters the brain. Studies on football players found elevated levels of S100B protein (a marker of BBB disruption) after practices with no diagnosed concussions. This barrier breakdown allows inflammatory molecules and proteins into the brain that shouldn\'t be there, triggering a chronic inflammatory response. Over time, this leads to neuroinflammation, white matter degradation, and reduced brain volume — all detectable on advanced imaging before any symptoms appear.'
        },
        {
          heading: '3. Long-Term Risks',
          content: 'The most concerning long-term consequence of cumulative subconcussive exposure is Chronic Traumatic Encephalopathy (CTE). Post-mortem studies have found CTE pathology — characterized by tau protein accumulation — in athletes who had no history of diagnosed concussions but had extensive exposure to repetitive head impacts. Symptoms of CTE include progressive cognitive decline, emotional instability, depression, and eventually dementia. The dose-response relationship is clear: more years of impact exposure correlates with higher CTE risk and severity.'
        },
        {
          heading: '4. Protection Strategies',
          content: 'Limit sparring frequency and intensity — two hard sparring sessions per week maximum. Implement "no headshot" sparring days to reduce cumulative exposure. Build neck strength to reduce head acceleration from impacts. Track your exposure over time using a sparring log. Take adequate rest between hard training blocks. The goal isn\'t to avoid training — it\'s to be smart about managing the total load your brain absorbs across a career.'
        }
      ]
    },
    deepDive: 'Subconcussive impacts induce a cascade of neurobiological changes that, while individually subclinical, accumulate to produce measurable neuropathology. Diffusion tensor imaging (DTI) studies demonstrate that repetitive subconcussive exposure produces fractional anisotropy changes in white matter tracts — particularly the corpus callosum, superior longitudinal fasciculus, and corona radiata — consistent with axonal microinjury. Bazarian et al. (2014) showed that a single season of contact sport participation produced DTI changes even in athletes with no diagnosed concussions. At the cellular level, repetitive mechanical stress triggers microglial activation and sustained neuroinflammation via the TLR4/NF-κB pathway, producing chronically elevated levels of IL-1β, TNF-α, and IL-6. The BBB disruption, quantified by dynamic contrast-enhanced MRI and serum S100B levels, creates a permissive environment for peripheral immune cell infiltration. The pathological hallmark of CTE — perivascular accumulation of hyperphosphorylated tau (p-tau) at sulcal depths — has been identified in individuals as young as 17 with impact sport exposure, suggesting that the pathological process begins early and progresses with continued exposure regardless of concussion diagnosis.'
  },
  {
    id: 4,
    title: 'Second Impact Syndrome',
    subtitle: 'Protect Your Weapon: The 30-Day Rule',
    simple: {
      intro: 'Second Impact Syndrome (SIS) is one of the most dangerous and misunderstood conditions in combat sports. Understanding it could save your life — or at least your career.',
      sections: [
        {
          heading: '1. What is Second Impact Syndrome?',
          content: 'SIS occurs when an athlete sustains a second concussion before the brain has fully recovered from the first. The initial concussion disrupts the brain\'s ability to regulate blood flow (cerebral autoregulation). If a second impact occurs while these regulatory mechanisms are still compromised, the brain can experience rapid, uncontrolled swelling (cerebral edema). Unlike a typical concussion, SIS can progress from mild symptoms to catastrophic brain herniation within minutes.'
        },
        {
          heading: '2. Why It\'s Dangerous',
          content: 'SIS can be fatal. The mortality rate is approximately 50%, and nearly 100% of survivors suffer permanent neurological disability. What makes it terrifying is that the second impact doesn\'t need to be severe — even a minor bump can trigger the cascade if the brain hasn\'t recovered from the initial injury. The brain swelling occurs because damaged blood vessels lose their ability to constrict and dilate properly, leading to massive increases in intracranial pressure that compress vital brainstem structures.'
        },
        {
          heading: '3. The Vulnerable Window',
          content: 'The metabolic recovery from a concussion takes much longer than symptom resolution. While symptoms may clear in 7–10 days, research by Vagnozzi et al. (2008) shows that full metabolic recovery — measured by brain NAA levels — takes 22 to 45 days. During this entire window, the brain is operating on reduced energy reserves and compromised autoregulation, making it extremely vulnerable to a second impact. This is why "feeling fine" is not the same as "being recovered."'
        },
        {
          heading: '4. Prevention',
          content: 'After any suspected concussion, absolute cognitive and physical rest for the first 48–72 hours. No return to sparring for a minimum of 30 days. Follow a graduated return-to-play protocol: light aerobic exercise → sport-specific training → non-contact drills → controlled contact → full sparring, with each stage lasting at least 24–48 hours and immediate cessation if any symptoms return. Never hide a concussion from your coach or doctor — the risk is simply not worth it.'
        }
      ]
    },
    deepDive: 'Second Impact Syndrome is mechanistically rooted in the loss of cerebrovascular autoregulation following initial concussive injury. Under normal conditions, cerebral arterioles maintain constant perfusion pressure through myogenic and neurogenic tone adjustments across a mean arterial pressure range of 50–150 mmHg. Concussive injury disrupts this autoregulation through several pathways: direct endothelial damage impairs nitric oxide-mediated vasodilation; sympathetic perivascular nerve disruption eliminates neurogenic vasoconstriction; and the spreading depolarization wave that follows concussion creates regional metabolic-perfusion mismatches. When a second impact occurs during this window of dysautoregulation, the resultant sympathetic surge produces uncontrolled cerebral vasodilation and hyperemia. The acute increase in cerebral blood volume, combined with cytotoxic edema from the first injury and vasogenic edema from renewed BBB disruption, creates a rapidly escalating intracranial pressure crisis. Brainstem herniation — either transtentorial or tonsillar — can occur within 2–5 minutes of the second impact. The metabolic vulnerability window, defined by NAA/Cr ratios measured via proton MRS, demonstrates that neuronal mitochondrial function remains compromised for 22–45 days post-injury (Vagnozzi et al., 2008), with the most critical period being days 3–15 when NAA depression is maximal and autoregulatory recovery is minimal.'
  },
  {
    id: 5,
    title: 'The Headgear Paradox',
    subtitle: 'Why Padding Doesn\'t Prevent Concussions',
    simple: {
      intro: 'Most fighters and coaches assume headgear protects against concussions. The science tells a very different — and counterintuitive — story.',
      sections: [
        {
          heading: '1. What Headgear Actually Does',
          content: 'Headgear is excellent at preventing cuts, abrasions, and facial lacerations. It provides a cushioning layer that absorbs surface-level impact energy and distributes it over a larger area. This is why it reduces black eyes, broken noses, and split eyebrows. However, headgear was never designed to prevent concussions, and it physically cannot address the primary mechanism of concussive brain injury.'
        },
        {
          heading: '2. Why It Fails Against Concussions',
          content: 'Concussions are caused primarily by rotational (angular) acceleration of the brain inside the skull, not by linear force. When your head rotates rapidly — from a hook, uppercut, or any off-center strike — your brain lags behind the skull\'s movement and impacts the interior walls. Headgear does not reduce rotational forces. In fact, the added mass and increased surface area of headgear can increase the rotational moment of inertia, potentially making rotational acceleration worse. Additionally, headgear creates a false sense of security, leading fighters to take more risks and absorb more hits.'
        },
        {
          heading: '3. Research Evidence',
          content: 'The evidence is compelling. AIBA (now IBA) removed headgear from elite amateur boxing in 2013 after studies showed no reduction in concussion rates with headgear use. A landmark study published in the British Journal of Sports Medicine found that concussion rates were actually similar — or in some analyses lower — after headgear removal. The McIntosh et al. (2014) study of over 7,000 boxing rounds confirmed that headgear provided no statistically significant protection against concussion.'
        },
        {
          heading: '4. What Actually Helps',
          content: 'Neck strength is the single most modifiable risk factor for concussion. A stronger neck reduces peak head acceleration from impacts by providing greater resistance to rotational forces. Studies show that every 1 lb increase in neck strength corresponds to a 5% reduction in concussion odds. Controlled sparring intensity, limiting rounds, and proper technique (keeping chin tucked, seeing punches coming) are far more effective than any headgear. Focus on strengthening the sternocleidomastoid, upper trapezius, and deep cervical flexors through targeted resistance training.'
        }
      ]
    },
    deepDive: 'The biomechanical failure of headgear in concussion prevention is rooted in the fundamental physics of rotational brain injury. The Holbourn (1943) model established that brain injury severity correlates with angular (rotational) acceleration rather than linear acceleration, because brain tissue is nearly incompressible (resistant to linear deformation) but highly susceptible to shear strain from rotational forces. Standard headgear, constructed from multi-density foams (typically EVA and PU), effectively attenuates linear impact force by 30–40% through material compression. However, it provides zero mitigation of angular acceleration because the rigid shell-to-skull coupling transmits rotational impulse directly. Worse, headgear increases the effective radius of the head by 15–25mm and adds 300–450g of mass, increasing the moment of inertia (I = mr²) by approximately 15–20%. For off-center impacts — which constitute the majority of concussive strikes in boxing — this increased moment of inertia can actually amplify peak angular acceleration. The AIBA\'s 2013 decision to remove headgear was informed by the Protective Headgear Assessment Team (PHAT) study and subsequent epidemiological analysis showing KO rates decreased by 43% after removal, likely attributable to reduced risk-taking behavior (risk compensation theory) and improved peripheral vision allowing fighters to better defend against incoming strikes. The evidence base strongly supports neck strengthening as the primary modifiable protective factor: Collins et al. (2014) demonstrated that for every 1-pound increase in neck strength, odds of concussion decreased by 5%, operating through the mechanism of increased cervical impedance to rapid angular head displacement.'
  }
];

const articleTabStyle = (isActive) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '12px 16px',
  background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
  border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`,
  borderRadius: '10px',
  color: isActive ? '#10b981' : 'var(--text-secondary)',
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: isActive ? '600' : '500',
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  textAlign: 'left',
});

export default function ArticlesPage() {
  const [activeArticle, setActiveArticle] = useState(0);
  const [showDeepDive, setShowDeepDive] = useState(false);

  const article = articles[activeArticle];

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>Free Articles</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Evidence-based concussion science for combat athletes — available to everyone
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '6px', position: 'sticky', top: '24px' }}>
          {articles.map((a, idx) => (
            <button
              key={a.id}
              style={articleTabStyle(idx === activeArticle)}
              onClick={() => { setActiveArticle(idx); setShowDeepDive(false); }}
            >
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: idx === activeArticle ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: idx === activeArticle ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0 }}>
                {idx + 1}
              </span>
              <span>{a.title}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '4px' }}>{article.title}</h2>
            <p style={{ color: 'var(--primary)', fontSize: '0.95rem', marginBottom: '16px' }}>{article.subtitle}</p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '20px' }}>{article.simple.intro}</p>

            {article.simple.sections.map((section, i) => (
              <div key={i} style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '8px', color: 'var(--primary)' }}>{section.heading}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>{section.content}</p>
              </div>
            ))}

            {article.simple.summary && (
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '20px', marginTop: '24px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)' }}>{article.simple.summary.title}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {article.simple.summary.points.map((point, i) => (
                    <li key={i} style={{ padding: '6px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: '700' }}>•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            className="btn"
            onClick={() => setShowDeepDive(!showDeepDive)}
            style={{ marginBottom: '16px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={showDeepDive ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
            </svg>
            {showDeepDive ? 'Hide Deep Dive' : 'Show Deep Dive'}
          </button>

          {showDeepDive && (
            <div className="glass-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                Deep Dive — Scientific Details
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.9rem' }}>{article.deepDive}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
