import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const lessons = [
  {
    id: 1,
    title: 'What is a Concussion',
    description: 'Understanding the fundamental biology of concussive brain injury. Learn what actually happens inside your skull when you take a hit.',
    simple: 'A concussion is not a bruise on the brain — it\'s a functional injury. When your head accelerates rapidly (from a punch, kick, or takedown), your brain shifts inside the skull and collides with the inner walls. This stretches and damages neurons, triggering a cascade of chemical reactions called the "neurometabolic cascade." Ion channels open indiscriminately, flooding cells with calcium and releasing potassium. Your brain\'s energy systems go into overdrive trying to restore balance, creating an "energy crisis" — massive ATP demand meets impaired blood flow. This is why you feel foggy, slow, and exhausted. The damage isn\'t structural (CT scans look normal), it\'s metabolic. Your brain is essentially running on empty while trying to repair itself. Symptoms include headache, dizziness, confusion, memory problems, light sensitivity, and emotional changes. Most resolve in 7–14 days, but full metabolic recovery takes 22–45 days.',
    deepDive: 'The pathophysiology of concussion involves a complex neurometabolic cascade initiated by biomechanical deformation of neural tissue. The primary mechanism is rotational acceleration causing shear strain at gray-white matter junctions, where tissue density differences create differential movement. Mechanoporation of neuronal membranes produces immediate, indiscriminate ionic flux: potassium efflux depolarizes adjacent neurons (spreading depression), while calcium influx activates calpains, phospholipases, and mitochondrial permeability transition pores. The Na+/K+-ATPase pumps engage maximally to restore ionic homeostasis, consuming ATP at rates 150–200% above baseline. Simultaneously, glutamate release from depolarized terminals activates NMDA receptors, producing excitotoxic calcium loading. Mitochondrial dysfunction (calcium-mediated opening of mPTP) impairs oxidative phosphorylation precisely when demand is highest. Cerebral blood flow decreases 50–70% due to endothelin-1 mediated vasospasm and loss of NO-dependent autoregulation. This supply-demand mismatch defines the "energy crisis." Recovery is tracked by 1H-MRS measurement of N-acetylaspartate (NAA), a marker of neuronal mitochondrial integrity, which shows depression lasting 22–45 days (Vagnozzi et al., 2008).'
  },
  {
    id: 2,
    title: 'Setting Expectations',
    description: 'What to expect during recovery and why patience is your most important tool. Timelines, milestones, and the non-linear nature of healing.',
    simple: 'Recovery from a concussion is not linear — you won\'t feel a little better every day. Instead, expect good days and bad days. Some days you\'ll feel almost normal, and the next day the fog rolls back in. This is completely normal and doesn\'t mean you\'re getting worse. Most symptoms resolve within 2 weeks, but true metabolic recovery takes 30+ days. Don\'t rush it. The biggest mistake fighters make is returning to training because they "feel fine." Feeling fine and being recovered are two different things. Set realistic expectations: Week 1 is rest and symptom management. Weeks 2–3 are gradual reintroduction of light activity. Weeks 4–6 are progressive return to sport-specific training. Only after completing a full graduated return-to-play protocol with zero symptom recurrence should you consider sparring again. Your brain is your most important weapon — protecting it is protecting your career.',
    deepDive: 'The non-linear recovery trajectory of concussion reflects the overlapping timescales of multiple healing processes. Ionic homeostasis is typically restored within 7–10 days, coinciding with symptom resolution in most patients. However, synaptic plasticity mechanisms (LTP/LTD restoration) require 14–21 days. Axonal cytoskeletal repair — involving neurofilament reorganization and microtubule stabilization — extends to 21–30 days. Mitochondrial biogenesis and full metabolic recovery, measured by NAA normalization, requires 22–45 days. The "feeling fine" paradox occurs because conscious symptom perception correlates primarily with ionic recovery, while vulnerability to re-injury correlates with metabolic recovery — creating a dangerous 2–4 week window where athletes feel recovered but remain physiologically compromised. Evidence-based return-to-play protocols (Berlin 2016 consensus) mandate a minimum 6-step graduated progression, with each stage separated by 24–48 hours and immediate regression to the previous stage upon any symptom recurrence.'
  },
  {
    id: 3,
    title: 'Understanding & Managing',
    description: 'Practical strategies for managing symptoms during recovery. Active rehabilitation has replaced the outdated "dark room" approach.',
    simple: 'The old advice of sitting in a dark room for weeks is outdated. Modern concussion science shows that active, controlled rehabilitation leads to faster and more complete recovery. After the first 24–48 hours of rest, you should begin gentle activity that stays below your symptom threshold. This means light walking, easy stationary cycling, or other activities that raise your heart rate without making symptoms worse. The key concept is the "symptom threshold" — the level of activity that triggers or worsens your symptoms. Stay just below it. Gradually, your threshold will rise and you\'ll tolerate more. Manage headaches with acetaminophen (avoid NSAIDs in the first 48 hours due to bleeding risk). Stay hydrated — your brain needs extra fluid during recovery. Limit screen time initially but don\'t eliminate it entirely. Sleep is critical — aim for 8–10 hours per night. Avoid alcohol completely during recovery, as it directly impairs the neurometabolic healing processes.',
    deepDive: 'The paradigm shift from prescriptive rest to active rehabilitation is supported by the Buffalo Concussion Treadmill Test (BCTT) research (Leddy et al., 2010–2023). Controlled sub-symptom-threshold aerobic exercise increases cerebral blood flow via exercise-induced upregulation of endothelial nitric oxide synthase (eNOS), directly addressing the post-concussive perfusion deficit. BDNF (brain-derived neurotrophic factor) release during exercise promotes neuroplasticity and synaptic repair. The autonomic nervous system recalibration achieved through graded aerobic exercise corrects the sympathetic-parasympathetic imbalance characteristic of post-concussion syndrome. The symptom-limited exercise threshold is determined by progressive treadmill testing using heart rate monitoring — the point at which symptoms increase by ≥3 points on the visual analog scale defines the ceiling. Exercise prescription is set at 80% of this threshold heart rate, with progressive increases as tolerance improves. This approach has been shown to reduce recovery time by 50% compared to strict rest protocols.'
  },
  {
    id: 4,
    title: 'Nervous System',
    description: 'How concussion disrupts your autonomic nervous system and practical techniques to restore balance between fight-or-flight and rest-and-digest.',
    simple: 'Your autonomic nervous system (ANS) has two branches: the sympathetic ("fight or flight") and parasympathetic ("rest and digest"). After a concussion, these two systems get out of balance — usually the sympathetic system is stuck in overdrive. This is why you might feel anxious, have a racing heart, sweat easily, be hypersensitive to light and sound, or have trouble sleeping. Your body is stuck in a state of constant alertness. To calm the nervous system, practice diaphragmatic breathing: breathe in through your nose for 4 counts, hold for 4, exhale through your mouth for 6–8 counts. This activates the vagus nerve and shifts you toward parasympathetic dominance. Other techniques include cold water face immersion (triggers the dive reflex), gentle yoga or stretching, meditation, and progressive muscle relaxation. Do these daily — consistency matters more than duration. Even 5 minutes of controlled breathing twice a day can significantly reduce ANS dysregulation.',
    deepDive: 'Post-concussive ANS dysfunction manifests as altered heart rate variability (HRV), specifically reduced high-frequency (HF) power reflecting impaired cardiac vagal modulation. The mechanism involves disruption of the central autonomic network (CAN), particularly the insular cortex and anterior cingulate cortex connections to the nucleus tractus solitarius and dorsal motor nucleus of the vagus. Baroreceptor sensitivity is reduced, and sympathetic tone is elevated as measured by increased low-frequency (LF) power and LF/HF ratio. This sympathovagal imbalance persists beyond symptom resolution and can be quantified using 5-minute resting HRV assessments. Vagal nerve stimulation through respiratory sinus arrhythmia (RSA) biofeedback — breathing at the resonant frequency of approximately 6 breaths per minute — has been shown to increase HRV coherence and restore parasympathetic tone. The diving reflex (cold water facial immersion at 10–15°C for 30 seconds) produces immediate vagal activation via the trigeminal-brainstem reflex arc. Progressive restoration of autonomic balance, tracked by normalized RMSSD and HF power, serves as a physiological marker of recovery readiness.'
  },
  {
    id: 5,
    title: 'Aerobic Exercise',
    description: 'Using controlled aerobic exercise as medicine for concussion recovery. The Buffalo Protocol and sub-threshold training explained.',
    simple: 'Aerobic exercise is one of the most powerful tools for concussion recovery — when used correctly. The key is sub-symptom-threshold exercise, meaning you exercise hard enough to get your heart rate up, but not so hard that your symptoms get worse. Start with walking or light stationary cycling at about 50–60% of your maximum heart rate. Monitor your symptoms during exercise. If headache, dizziness, or nausea increase, reduce intensity or stop. Gradually increase the duration (start with 15 minutes, build to 30+) and intensity over days and weeks. The exercise increases blood flow to the brain, releases growth factors that help repair neurons, and recalibrates your autonomic nervous system. This is called the Buffalo Protocol and it\'s been shown to cut recovery time in half compared to just resting. Don\'t jump straight to combat training — follow the progression: walking → cycling → jogging → sport-specific drills → non-contact training → controlled sparring. Each step should be symptom-free for 24–48 hours before progressing.',
    deepDive: 'The Buffalo Concussion Treadmill Test (BCTT) protocol, developed by Leddy, Baker, and Willer, operationalizes exercise as a therapeutic intervention through precise dose-response calibration. The initial assessment uses a modified Balke treadmill protocol (starting at 3.3 mph, 0% grade, increasing 1% grade per minute) to determine the symptom-exacerbation threshold, measured by real-time visual analog scale scoring. Exercise prescription is set at 80–90% of the threshold heart rate for 20 minutes daily. The physiological mechanisms include: (1) exercise-induced upregulation of endothelial nitric oxide synthase (eNOS) restoring cerebrovascular reactivity and CO2 vasodilatory capacity; (2) increased BDNF expression promoting neurogenesis in the hippocampal dentate gyrus and synaptic plasticity; (3) autonomic recalibration through baroreceptor resetting and vagal tone enhancement; (4) reduction of neuroinflammatory markers (IL-6, TNF-α) through myokine release (particularly irisin and cathepsin B). RCTs demonstrate that early (<10 days post-injury) prescribed aerobic exercise reduces median recovery time from 17 days (strict rest) to 9 days (exercise group), with no increased adverse events (Leddy et al., 2019).'
  },
  {
    id: 6,
    title: 'Diet & Nutrition',
    description: 'Fueling your brain\'s recovery with targeted nutrition. Anti-inflammatory foods, supplements, and what to avoid.',
    simple: 'Your brain needs specific nutrients to repair itself after injury. Think of it as providing the raw materials for a construction crew. Omega-3 fatty acids (especially DHA) are critical — they make up the structural membrane of neurons. Eat fatty fish (salmon, mackerel) 3x per week or supplement with 2–3g of fish oil daily. Anti-inflammatory foods reduce neuroinflammation: berries, leafy greens, turmeric (with black pepper for absorption), and green tea. Creatine monohydrate (3–5g daily) provides the brain\'s backup energy system. Magnesium glycinate (400mg before bed) supports sleep and reduces excitotoxicity. Vitamin D (2000–4000 IU daily) — deficiency is associated with worse concussion outcomes. Avoid alcohol completely during recovery — it directly impairs neuronal repair and worsens inflammation. Limit processed sugar and refined carbs, which promote inflammation. Stay well-hydrated — dehydration reduces the cerebrospinal fluid cushion around your brain. Eat frequent, balanced meals to maintain stable blood sugar, as the recovering brain is highly sensitive to glucose fluctuations.',
    deepDive: 'Nutritional intervention in concussion recovery targets specific molecular pathways of neuronal repair. DHA (docosahexaenoic acid, 22:6n-3) constitutes 40% of polyunsaturated fatty acids in neuronal membranes and is the precursor to neuroprotectin D1 (NPD1), a specialized pro-resolving mediator that inhibits NF-κB-mediated neuroinflammation and promotes cell survival via Bcl-2 upregulation. Supplementation at 2–3g/day restores membrane fluidity and facilitates axonal repair. Creatine monohydrate at 5g/day increases brain PCr reserves by ~9% (measured by 31P-MRS), buffering the ATP deficit during the metabolic crisis window. Magnesium serves as a natural NMDA receptor antagonist, reducing excitotoxic calcium influx — post-concussive hypomagnesemia is well-documented and correlates with symptom severity. Curcumin (the active compound in turmeric) inhibits the TLR4/NF-κB neuroinflammatory pathway and reduces microglial activation. Ketogenic or modified ketogenic diets are under investigation for their ability to provide the recovering brain with alternative fuel (ketone bodies), bypassing the impaired glucose metabolism characteristic of the post-concussive metabolic state.'
  },
  {
    id: 7,
    title: 'Sleep',
    description: 'Why sleep is the ultimate recovery tool and how to optimize it when concussion symptoms make it difficult.',
    simple: 'Sleep is when your brain does most of its repair work. During deep sleep, your brain activates the glymphatic system — essentially a waste-clearance system that flushes out damaged proteins and metabolic debris at 10x the daytime rate. After a concussion, this cleanup process is even more critical, but many athletes struggle with sleep due to their injury. To optimize sleep: maintain a consistent sleep schedule (same time every night), keep your room cool (65–68°F/18–20°C) and completely dark, avoid screens for 1 hour before bed (blue light suppresses melatonin), avoid caffeine after noon. If you can\'t fall asleep, try magnesium glycinate (400mg before bed) — it promotes relaxation and supports the GABA system. Melatonin (0.5–3mg, 30 minutes before bed) can help reset your circadian rhythm. Napping is okay during early recovery — your brain is telling you it needs more repair time. Aim for 8–10 hours per night during recovery. Sleep quality matters as much as quantity — if you\'re waking frequently, address environmental factors first.',
    deepDive: 'The glymphatic system, characterized by Nedergaard et al. (2012), operates primarily during NREM slow-wave sleep when the interstitial space expands by 60% due to aquaporin-4 (AQP4) mediated astroglial volume changes. This creates convective flow of cerebrospinal fluid through the brain parenchyma, clearing metabolic waste including β-amyloid, tau, and damaged cellular debris at rates 10x higher than wakefulness. Post-concussive sleep disruption — affecting 30–70% of patients — impairs this clearance mechanism at precisely the time when metabolic waste accumulation is highest. Disrupted sleep architecture shows reduced N3 (deep sleep) proportion and increased sleep fragmentation, both reducing glymphatic efficiency. Melatonin supplementation addresses circadian rhythm disruption via MT1/MT2 receptor activation in the suprachiasmatic nucleus, with additional neuroprotective effects through free radical scavenging and mitochondrial membrane stabilization. Magnesium glycinate potentiates GABAergic inhibition and blocks NMDA-receptor mediated excitotoxicity. The emerging evidence suggests that optimizing sleep may be the single most impactful intervention in concussion recovery due to the glymphatic system\'s role in clearing the neurometabolic debris that drives secondary injury progression.'
  },
  {
    id: 8,
    title: 'Neck',
    description: 'Your neck is your brain\'s first line of defense. Strengthening it is the single most effective way to reduce concussion risk.',
    simple: 'Your neck is the most overlooked factor in concussion prevention. A stronger neck acts as a natural shock absorber, reducing how much your head accelerates when you get hit. Research shows that every 1 pound increase in neck strength corresponds to a 5% reduction in concussion risk (Collins et al., 2014). The key muscles to target are the sternocleidomastoid (front/sides), upper trapezius (back), and deep cervical flexors (stabilizers). Simple exercises you can do daily: neck isometric holds against your hand (push forward, backward, left, right — hold 10 seconds, 3 sets each direction), 4-way neck harness work with light weight (start with 2.5–5 lbs), and band-resisted neck rotations. Also critical: cervical proprioception training — your neck helps your brain know where your head is in space. If your neck is injured, your brain can\'t properly coordinate your defensive movements, and you may experience concussion-like symptoms from a neck injury alone (cervicogenic dizziness). Train your neck as seriously as you train your jab.',
    deepDive: 'Cervical musculature provides the primary biomechanical attenuation of cranial acceleration forces. The mechanism is impedance-based: a stiffer cervical column (increased muscular co-contraction) increases the effective mass of the head-neck segment, thereby reducing peak angular acceleration for a given impulse (F·Δt = m·Δv). Eckner et al. (2014) demonstrated that anticipatory cervical muscle activation reduces peak head acceleration by 30–40% compared to unanticipated impacts. Collins et al. (2014) quantified the dose-response relationship: each 1-pound increase in composite neck strength (measured by hand-held dynamometry in flexion, extension, and lateral flexion) reduced concussion odds by 5% in a cohort of 6,704 athletes. The cervicogenic contribution to post-concussive symptomatology operates through the trigeminocervical complex (TCC), where convergent afferents from C1-C3 dorsal roots and the trigeminal spinal nucleus create referred pain patterns indistinguishable from post-concussive cephalgia. Cervical proprioceptive dysfunction — impaired joint position sense from injury to facet joint mechanoreceptors — produces cervicogenic dizziness that mimics vestibular concussion symptoms. Training protocols should include isometric strength development (maximum voluntary contraction), reactive stabilization (perturbation training), and proprioceptive retraining (joint position sense exercises).'
  },
  {
    id: 9,
    title: 'Visual / Vestibular',
    description: 'Retraining your eyes and balance system after concussion. The visual-vestibular connection is often the last thing to recover.',
    simple: 'Your vision and balance systems are intimately connected, and concussion often disrupts both. Three systems work together to keep you oriented: your eyes (visual), your inner ear (vestibular), and your body\'s position sensors (proprioception). When these systems disagree, you feel dizzy, nauseous, or "off." After a concussion, the brain struggles to integrate signals from all three systems simultaneously. Simple rehabilitation exercises: Gaze stabilization — hold a business card at arm\'s length, focus on a letter, and turn your head side to side while keeping the letter in focus (start slow, 30 seconds, build up). Balance training — stand on one foot with eyes open (30 seconds), then eyes closed. Progress to unstable surfaces (pillow, balance board). Smooth pursuit — follow a moving finger smoothly with your eyes without moving your head. Saccade training — look quickly between two targets placed 3 feet apart. Do these exercises 2–3 times daily, 5–10 minutes per session. Expect mild symptom provocation (this is therapeutic), but stop if symptoms increase significantly. The vestibular system is often the last concussion symptom to fully resolve.',
    deepDive: 'The vestibulo-ocular reflex (VOR) is the primary mechanism disrupted in post-concussive visual-vestibular dysfunction. The VOR maintains stable retinal images during head movement through a three-neuron arc: vestibular afferents → vestibular nuclei → oculomotor nuclei, producing compensatory eye movements equal and opposite to head velocity with a latency of 10–15ms. Concussive injury disrupts VOR gain (ratio of eye velocity to head velocity), producing oscillopsia and retinal slip during head movements. Clinical assessment via the Video Head Impulse Test (vHIT) quantifies VOR gain and identifies covert/overt corrective saccades indicating canal-specific dysfunction. Vestibular rehabilitation therapy (VRT) leverages neural plasticity to recalibrate the VOR through: (1) adaptation exercises (VORx1 and VORx2 paradigms) that drive error-signal-dependent cerebellar recalibration of vestibular nucleus gain; (2) habituation exercises that reduce central sensitization to provocative movements through repeated, controlled exposure; (3) substitution training that enhances alternative sensory strategies (visual and somatosensory) through Romberg progression and dynamic platform training. The convergence insufficiency frequently observed post-concussion — characterized by increased near point of convergence (>6cm) and reduced positive fusional vergence — requires specific vergence training with progressive demand. Recovery of visual-vestibular integration typically lags other concussion domains by 2–4 weeks.'
  }
];

export default function CoursePage() {
  const { currentUser, hasCoursePurchased } = useAuth();
  const { showToast } = useToast();
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [deepDiveLessons, setDeepDiveLessons] = useState({});

  async function purchaseCourse() {
    if (!currentUser) {
      showToast('Please sign in to purchase the guide', 'warning');
      return;
    }
    try {
      const response = await fetch('/api/stripe/course-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ return_url: window.location.origin })
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else showToast('Failed to start checkout', 'error');
    } catch (error) {
      showToast('Failed to start checkout', 'error');
    }
  }

  const toggleDeepDive = (lessonId) => {
    setDeepDiveLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  if (!hasCoursePurchased) {
    return (
      <div>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>Concussion Recovery Guide</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            The complete fighter's guide to understanding and recovering from concussions
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ filter: 'blur(4px)', opacity: 0.3, pointerEvents: 'none' }}>
            {lessons.slice(0, 3).map((lesson) => (
              <div className="glass-card" key={lesson.id} style={{ marginBottom: '16px' }}>
                <h3>{lesson.id}. {lesson.title}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{lesson.description}</p>
              </div>
            ))}
          </div>

          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card" style={{ maxWidth: '500px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.85)', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.1)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧠</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Concussion Recovery Guide</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
                9 comprehensive lessons covering everything from brain biology to visual-vestibular rehabilitation. Written specifically for combat athletes by concussion specialists.
              </p>
              <div style={{ fontSize: '2.2rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>$29.99</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>One-time purchase • Includes 1 month free Pro badge</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', textAlign: 'left' }}>
                {['9 in-depth lessons with Simple & Deep Dive modes', 'Evidence-based protocols for fighters', 'Neck strengthening & vestibular rehab guides', 'Nutrition & supplement recommendations', 'Lifetime access to all content'].map((item, i) => (
                  <li key={i} style={{ padding: '6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--primary)', marginRight: '8px' }}>✓</span>{item}
                  </li>
                ))}
              </ul>
              <button className="btn-primary" onClick={purchaseCourse} style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '14px 24px' }}>
                Purchase Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>Concussion Recovery Guide</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          9 lessons — tap any lesson to expand. Toggle between Simple and Deep Dive explanations.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {lessons.map((lesson) => {
          const isExpanded = expandedLesson === lesson.id;
          const isDeepDive = deepDiveLessons[lesson.id] || false;

          return (
            <div className="glass-card" key={lesson.id} style={{ cursor: 'pointer', transition: 'all 0.3s ease', borderColor: isExpanded ? 'rgba(16, 185, 129, 0.3)' : undefined }}>
              <div onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isExpanded ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: isExpanded ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>
                  {lesson.id}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '4px' }}>{lesson.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{lesson.description}</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-glow)' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button className={isDeepDive ? 'btn btn-sm' : 'btn-primary'} style={isDeepDive ? { padding: '6px 14px', fontSize: '0.8rem' } : { padding: '6px 14px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); toggleDeepDive(lesson.id); }}>
                      {isDeepDive ? '← Simple Explanation' : 'Deep Dive →'}
                    </button>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.9rem' }}>
                    {isDeepDive ? lesson.deepDive : lesson.simple}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
