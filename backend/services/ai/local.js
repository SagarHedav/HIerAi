function tokenize(text) {
  const stop = new Set([
    'the','and','for','are','with','this','that','from','have','has','you','your','our','their','was','were','but','not','all','any','can','will','into','over','under','a','an','to','in','on','of','at','by','as','it','is','be','or','we','i'
  ])
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+\-#\.\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stop.has(t))
}

function tf(tokens) {
  const map = new Map()
  tokens.forEach(t => map.set(t, (map.get(t) || 0) + 1))
  return map
}

function buildVectors(aTokens, bTokens) {
  const vocab = new Set([...aTokens, ...bTokens])
  const aTF = tf(aTokens)
  const bTF = tf(bTokens)
  const N = 2
  const df = new Map()
  vocab.forEach(t => {
    let d = 0
    if (aTF.has(t)) d++
    if (bTF.has(t)) d++
    df.set(t, d)
  })
  const idf = new Map()
  vocab.forEach(t => {
    const d = df.get(t)
    idf.set(t, Math.log((N + 1) / (d + 1)) + 1)
  })
  const aVec = []
  const bVec = []
  vocab.forEach(t => {
    aVec.push((aTF.get(t) || 0) * idf.get(t))
    bVec.push((bTF.get(t) || 0) * idf.get(t))
  })
  return { aVec, bVec }
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function keywordMatch(requirements, resumeTokens) {
  const resumeSet = new Set(resumeTokens)
  const matched = []
  const missing = []
  const normWord = w => w.toLowerCase().replace(/[^a-z0-9+\-#\.]/g, '')
  const reqNorms = (requirements || []).map(r =>
    r.split(/[^a-z0-9+\-#\.]+/i).filter(Boolean).map(normWord).filter(w => w.length > 2)
  )

  reqNorms.forEach((words, i) => {
    const ok = words.some(w => resumeSet.has(w))
    if (ok) matched.push(requirements[i])
    else missing.push(requirements[i])
  })
  const bonus = Math.min(1, (matched.length || 0) / Math.max(1, requirements?.length || 1))
  return { bonus, matched, missing }
}

export async function scoreLocal({ jobText, requirements, resumeText }) {
  const a = tokenize(resumeText || '')
  const b = tokenize(jobText || '')
  const { aVec, bVec } = buildVectors(a, b)
  const tfidfSim = cosine(aVec, bVec) // 0..1

  const { bonus, matched, missing } = keywordMatch(requirements || [], a)

  // Weights (tunable via env)
  const tfidfW = Math.max(0, parseFloat(process.env.LOCAL_TFIDF_WEIGHT || '0.8'))
  const kwW = Math.max(0, parseFloat(process.env.LOCAL_KEYWORD_WEIGHT || '0.2'))
  const denom = tfidfW + kwW || 1

  const final = (tfidfW * tfidfSim + kwW * bonus) / denom
  const score = Math.round(Math.max(0, Math.min(1, final)) * 100)

  const rationale = `Local score based on TF-IDF similarity (${(tfidfSim*100).toFixed(1)}%, w=${tfidfW}) and keyword coverage (${(bonus*100).toFixed(1)}%, w=${kwW}). Matched ${matched.length}/${requirements?.length || 0} requirements.`

  return {
    score,
    strengths: matched.slice(0, 10),
    gaps: missing.slice(0, 10),
    matchedKeywords: matched.slice(0, 20),
    rationale
  }
}
