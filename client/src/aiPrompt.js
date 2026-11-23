import { SENIORITY_OPTIONS } from './constants'

// Builds the resume-generation prompt from a profile (the GET /api/profile shape).
// Empty values are left out, so the prompt never shows blank lines like "Phone Number: ".

const RULE = '='.repeat(40)
const heading = (title) => `${RULE}\n${title}\n${RULE}`

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim())
const joinParts = (...parts) => parts.map(clean).filter(Boolean).join(', ')
const bulletList = (lines) => lines.map((l) => `- ${l}`).join('\n')

function seniorityLine(p) {
  const level = SENIORITY_OPTIONS.find((o) => o.value === p.seniority)?.label
  const years = Number(p.yearsOfExperience)
  const yearsText = years > 0 ? `over ${years} ${years === 1 ? 'year' : 'years'} of experience` : ''
  if (level && yearsText) return `${level} level with ${yearsText}`
  if (level) return `${level} level`
  return yearsText ? `${yearsText[0].toUpperCase()}${yearsText.slice(1)}` : ''
}

function experienceLine(e) {
  const bullets = Number(e.bullets)
  const bulletsText = bullets > 0 ? `${bullets} Bullet ${bullets === 1 ? 'Point' : 'Points'}` : ''
  return joinParts(e.company, e.location, e.period, bulletsText)
}

function profileSection(p) {
  const blocks = []

  const personal = [
    ['Full Name', p.name],
    ['Email Address', p.email],
    ['Phone Number', p.phone],
    ['Location', p.location],
  ]
    .filter(([, v]) => clean(v))
    .map(([label, v]) => `${label}: ${clean(v)}`)
  if (personal.length) blocks.push(personal.join('\n'))

  const links = [
    ['LinkedIn', p.linkedin],
    ['GitHub', p.github],
    ['Website', p.website],
  ]
    .filter(([, v]) => clean(v))
    .map(([label, v]) => `${label}: ${clean(v)}`)
  if (links.length) blocks.push(`Online Presence:\n${bulletList(links)}`)

  const work = [seniorityLine(p), bulletList((p.experiences ?? []).map(experienceLine).filter(Boolean))]
    .filter(Boolean)
    .join('\n')
  if (work) blocks.push(`Work Experience:\n${work}`)

  const education = (p.education ?? [])
    .map((e) => joinParts(e.institution, e.location, e.degree, e.period))
    .filter(Boolean)
  if (education.length) blocks.push(`Education:\n${bulletList(education)}`)

  const certifications = (p.certifications ?? [])
    .map((c) => joinParts(c.institution, c.name, c.date))
    .filter(Boolean)
  if (certifications.length) blocks.push(`Certifications:\n${bulletList(certifications)}`)

  return blocks.join('\n\n')
}

const OUTPUT_FORMAT = `Return ONE JSON object with the following structure:
{
  "personal_info": {
    "name": "",
    "email": "",
    "phone": "",
    "location": ""
  },
  "headline": "",
  "online_presence": {
    "linkedin": "",
    "github": "",
    "website": ""
  },
  "company_target": ""
  "summary": "",
  "skillsets": [
    {
      "category": "",
      "skills": []
    }
  ],
  "experience": [
    {
      "company": "",
      "location": "",
      "title": "",
      "period": "",
      "sentences": [],
      "used_skills": [],
      "role_description": ""
    }
  ],
  "education": [
    {
      "institution": "",
      "major_degree": "",
      "period": ""
    }
  ],
  "certification": [
    {
      "institution": "",
      "name": "",
      "date": ""
    }
  ]
}`

const CONTENT_RULES = `"company_target":
- Must find the company name from the job description
- If the company name is not mentioned in the job description, set company name to Unknown

JOB TITLES AND HEADLINE (non-negotiable)
Every job title and headline must be 2–4 words and common industry titles
- Job titles must be aligned with the job description
- Job titles must follow a logical career progression and candidate's own seniority level.
- Headline must reflect job titles and be aligned with the job description

"summary"
- Must be 3–4 sentences.
- Must be professional, ATS-optimized, concise.
- Must be aligned with the job description.

"skillsets":
- Must be categorized, prefer single-concept category names.
- Must order categories professionally, not by which posting skill appears first.
- Must be 30-40 (recommended), at most 56 (limit) total skills, placed in right category.
- Must include skills from the job description.
- DO NOT include ATS junk.

"sentences" (non-negotiable)
- DO NOT include the candidate name, company name, or pronouns such as he or she.
- Every sentence must be 150–220 characters.
- Every sentence must end with a period.
- Every sentence must reference its company industry relevance and career growth.
- Every sentence must be detailed, specific, aligned with the job description.
- Every sentence must include technically rich descriptions of the role, specific contributions, and technologies used.
- Every sentence must include ONLY technologies released before its company period.

"used_skills":
Must be ONLY 4-12 technologies from that role's evidence line, the posting's terms first.

"role_description":
Must be 1-2 sentences (20-45 words), introduces bullet points: the project, platform, product, or client, and its purpose and scale, then the part of the system the bullets show, framed around the posting's work and naming 2-4 of the key technologies those bullets use.`

const FORMATTING_RULES = `- Only one code block of JSON
- No questions or comments
- Valid JSON syntax
- ATS-safe language only`

const FINAL_CHECK = `- Must be only one CODE BLOCK of VALID JSON.
- Must be generated strictly under all of the content rules.`

export function buildResumePrompt(profile, jobDescription = '') {
  const sections = [
    ['CANDIDATE PROFILE', profileSection(profile)],
    ['OUTPUT FORMAT', OUTPUT_FORMAT],
    ['JSON CONTENT GENERATION RULES (STRICT)', CONTENT_RULES],
    ['FORMATTING RULES', FORMATTING_RULES],
    ['FINAL CHECK', FINAL_CHECK],
    ['JOB DESCRIPTION', clean(jobDescription)],
  ]
  return [
    'You are a resume generation engine.\nYou must generate a resume from the given candidate information, generation rules and job description.',
    ...sections.map(([title, body]) => `${heading(title)}\n${body}`),
  ]
    .join('\n\n')
    .trimEnd()
}

// String.raw keeps the literal "\n" / "\n\n" sequences the model is told to emit.
const coverLetterInstructions = (name) => String.raw`Generate a complete, professional cover letter body - greeting, paragraphs, and sign-off - as a single string with paragraphs separated by blank lines (\n\n).

Required structure (exact order)
Greeting line: Hi Hiring Manager,
3-4 short body paragraphs anchored to the role.

Candidate's full name: ${name}

Sign-off block: Best regards, then a newline (\n) then the candidate's full name (e.g. Best regards,\n${name}).
Use \n\n between the greeting, each body paragraph, and the sign-off block. Use a single \n only inside the sign-off, between Best regards, and the name.

Focus on the role
Anchor the letter to the specific role, company, and job description from the structured job context.
Tie relevant experience and technical skills to what the posting asks for.
Use concrete examples from the candidate profile and project evidence when available.
Prioritize overlap between job requirements and the candidate's background.
Do not pad with generic praise for the company.

Tone and style
Be concise, realistic, and polite.
Write like a senior engineer in their own voice, not a marketing brochure.
Sound natural and human. Avoid stiff, formulaic, or overly polished phrasing.
Never use em dashes.
Do not sound like AI-generated copy.
Avoid buzzword stacks, empty superlatives (thrilled, passionate, perfect fit), vague claims, and repetitive sentence patterns.
Prefer plain, direct sentences. One clear point per paragraph.

Output rules
Start with the greeting, end with the sign-off block. Do not include the candidate's contact details, address, the company address, or the date - those live in the template's letterhead.
The sign-off name MUST be the candidate's actual full name from the profile (first + last). Do not use placeholders like [Name].
Do not invent experience, skills, or metrics not supported by the project evidence.
Keep the total length tight. Shorter is better when the fit is clear.`

export function buildCoverLetterPrompt(profile) {
  return coverLetterInstructions(clean(profile.name))
}
