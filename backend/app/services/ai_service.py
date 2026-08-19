import json
import os

from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = (
    "You are CareerMind.AI, a helpful AI career mentor. You help users with career "
    "advice, resume tips, interview preparation, skill development and job search "
    "strategy. Be concise, practical and encouraging."
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def _gemini_call(messages: list[dict], temperature: float, max_tokens: int) -> str:
    from google import genai

    client = genai.Client(api_key=GEMINI_API_KEY)
    content = "\n\n".join(
        f"{m['role']}: {m['content']}" for m in messages
    )
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=content,
    )
    return response.text or ""


# Ordered fallback models used when the configured one is out of quota /
# unavailable. Keeps AI features alive even when a model hits rate limits.
_FALLBACK_MODELS = [
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]


def _llm_call(messages: list[dict], temperature: float = 0.7, max_tokens: int = 1024) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to your backend .env file."
        )
    from google import genai

    client = genai.Client(api_key=GEMINI_API_KEY)
    content = "\n\n".join(f"{m['role']}: {m['content']}" for m in messages)

    ordered = [GEMINI_MODEL] + [m for m in _FALLBACK_MODELS if m != GEMINI_MODEL]
    last_error = None
    for model in ordered:
        try:
            response = client.models.generate_content(
                model=model,
                contents=content,
            )
            return response.text or ""
        except Exception as exc:
            last_error = exc
            print(f"[AI] Model '{model}' failed ({type(exc).__name__}); trying next.")
    raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")


def generate_reply(history: list[dict], memory_context: str | None = None) -> str:
    """Call the LLM with the conversation history (list of {role, content}).
    Optionally inject long-term-memory context recalled from past conversations
    so replies are personalized instead of generic."""
    messages = list(history)
    if memory_context and memory_context.strip():
        messages = [
            {
                "role": "system",
                "content": (
                    "You keep long-term memory of this user's earlier conversations. "
                    "Use the following recalled details to personalize your reply and "
                    "reference relevant past information naturally:\n\n"
                    + memory_context.strip()
                ),
            }
        ] + messages
    return _llm_call(messages, temperature=0.7, max_tokens=1024)


def _parse_json(text: str, fallback: dict) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return fallback
        return fallback


def generate_skill_gap(target_role: str, current_skills: list[str]) -> dict:
    """Compare a target role against the user's current skills and return a JSON analysis."""
    prompt = (
        f"Target role: {target_role}\n"
        f"User's current skills: {', '.join(current_skills) if current_skills else 'none listed'}\n\n"
        "Analyze the skill gap for achieving this role. Return a valid JSON object with "
        "exactly these keys:\n"
        "{\n"
        '  "role": "<the target role>",\n'
        '  "required_skills": ["skill", ...],\n'
        '  "missing_skills": ["skill", ...],\n'
        '  "matched_skills": ["skill", ...],\n'
        '  "recommendations": ["actionable step", ...],\n'
        '  "overall_readiness": <integer 0-100>\n'
        "}\n"
        "Do not include any text outside the JSON object."
    )
    fallback = {
        "role": target_role,
        "required_skills": [],
        "missing_skills": [],
        "matched_skills": current_skills,
        "recommendations": [],
        "overall_readiness": 0,
    }
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=1500,
    )
    data = _parse_json(text, fallback)
    for key in ("required_skills", "missing_skills", "matched_skills", "recommendations"):
        if not isinstance(data.get(key), list):
            data[key] = []
    if not isinstance(data.get("overall_readiness"), int):
        data["overall_readiness"] = 0
    data["role"] = target_role
    return data


def generate_roadmap(target_role: str, duration: str = "3mo") -> list[dict]:
    """Generate a weekly career roadmap for the target role, returning a list of week dicts."""
    prompt = (
        f"Create a {duration} career roadmap for someone targeting the role: {target_role}.\n\n"
        "Return a valid JSON object with exactly this shape:\n"
        "{\n"
        '  "weeks": [\n'
        "    {\n"
        '      "week": 1,\n'
        '      "title": "<short milestone title>",\n'
        '      "tasks": ["<concrete task>", "<concrete task>"]\n'
        "    }\n"
        "  ]\n"
        "}\n"
        f"The roadmap must contain 12 weeks (week 1 through 12). Each week needs 2-3 concrete, "
        "actionable tasks that build progressively toward the role. Do not include any text "
        "outside the JSON object."
    )
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=2500,
    )
    data = _parse_json(text, {"weeks": []})
    weeks = data.get("weeks", [])
    if not isinstance(weeks, list):
        weeks = []
    normalized = []
    for w in weeks:
        if not isinstance(w, dict):
            continue
        tasks = w.get("tasks", [])
        if not isinstance(tasks, list):
            tasks = []
        tasks = [t for t in tasks if isinstance(t, str) and t.strip()] or []
        normalized.append(
            {
                "week": int(w.get("week", 0)),
                "title": str(w.get("title", "Milestone")),
                "description": "\n".join(f"• {t}" for t in tasks),
                "tasks": tasks,
            }
        )
    return sorted(normalized, key=lambda x: x["week"])


def generate_job_recommendations(context: dict) -> list[dict]:
    """Recommend jobs based on the user's skills, experience and goals."""
    prompt = (
        "Recommend suitable job roles for this candidate.\n"
        "Candidate profile:\n"
        f"- Headline: {context.get('headline') or 'N/A'}\n"
        f"- Skills: {', '.join(context.get('skills', []) or []) or 'none'}\n"
        f"- Experience: {', '.join(context.get('experience', []) or []) or 'none'}\n"
        f"- Career goal / target role: {context.get('target_role') or 'N/A'}\n\n"
        "Return a valid JSON object with exactly this shape:\n"
        "{\n"
        '  "jobs": [\n'
        "    {\n"
        '      "title": "<job title>",\n'
        '      "company": "<sample company>",\n'
        '      "match_score": <integer 0-100>,\n'
        '      "missing_skills": ["skill", ...],\n'
        '      "timeline_to_apply": "<short estimate like \\"1-2 weeks\\">",\n'
        '      "description": "<1-2 sentence summary>"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Provide 6 job recommendations. Score 0-100 based on how well the candidate's "
        "current profile matches each job. Do not include any text outside the JSON object."
    )
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
        max_tokens=2000,
    )
    data = _parse_json(text, {"jobs": []})
    jobs = data.get("jobs", [])
    if not isinstance(jobs, list):
        jobs = []

    normalized = []
    for j in jobs:
        if not isinstance(j, dict):
            continue
        score = j.get("match_score", 0)
        try:
            score = max(0, min(100, int(score)))
        except (TypeError, ValueError):
            score = 0
        missing = j.get("missing_skills", [])
        if not isinstance(missing, list):
            missing = []
        normalized.append(
            {
                "title": str(j.get("title", "Role")),
                "company": str(j.get("company", "")),
                "match_score": score,
                "missing_skills": missing,
                "timeline_to_apply": str(j.get("timeline_to_apply", "Not sure")),
                "description": str(j.get("description", "")),
            }
        )
    return sorted(normalized, key=lambda x: x["match_score"], reverse=True)


STOPWORDS = {
    "a", "an", "the", "and", "or", "for", "with", "of", "to", "in", "on",
    "at", "as", "by", "is", "are", "was", "were", "be", "been", "from",
    "able", "across", "over", "using", "use", "used", "i", "my", "me", "we",
}


def _keyword_vector(text: str) -> dict:
    """Lightweight sparse bag-of-words 'embedding' of the CV text."""
    words = "".join(ch if ch.isalnum() or ch.isspace() else " " for ch in text.lower()).split()
    return {w: words.count(w) for w in set(words) if w and w not in STOPWORDS}


def _has_keyword(text: str, keyword: str) -> bool:
    needle = keyword.strip().lower()
    if not needle:
        return False
    if needle in text.lower():
        return True
    return needle.replace(" ", "") in text.lower().replace(" ", "")


def analyze_resume(resume_text: str, target_role: str) -> dict:
    """Analyze a resume for ATS compatibility.
    Uses the LLM for deep analysis, then a local keyword-embedding layer
    (sparse bag-of-words vectors over the CV) to verify keyword coverage and
    blend it into the final ATS score."""
    prompt = (
        f"Analyze this resume for ATS (Applicant Tracking System) compatibility "
        f"for the target role: {target_role}.\n\nRESUME:\n{resume_text[:12000]}\n\n"
        "Return a valid JSON object with exactly these keys:\n"
        "{\n"
        '  "ats_score": <integer 0-100>,\n'
        '  "summary": "<2-3 sentence overall analysis including formatting assessment>",\n'
        '  "required_keywords": ["keyword", ...],\n'
        '  "missing_keywords": ["keyword", ...],\n'
        '  "matched_keywords": ["keyword", ...],\n'
        '  "formatting_issues": ["issue", ...],\n'
        '  "strengths": ["strength", ...],\n'
        '  "improvements": ["specific actionable suggestion", ...]\n'
        "}\n"
        "Do not include any text outside the JSON object."
    )
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=2500,
    )
    data = _parse_json(text, {})

    ats = data.get("ats_score", 0)
    try:
        ats = max(0, min(100, int(ats)))
    except (TypeError, ValueError):
        ats = 0
    for key in (
        "required_keywords",
        "missing_keywords",
        "matched_keywords",
        "formatting_issues",
        "strengths",
        "improvements",
    ):
        if not isinstance(data.get(key), list):
            data[key] = []
    summary = str(data.get("summary", ""))[:2000]

    required = [str(k) for k in data.get("required_keywords", [])]
    matched = [k for k in required if _has_keyword(resume_text, k)]
    missing = [k for k in required if k not in matched]
    coverage = round(len(matched) / len(required) * 100) if required else 0
    final_score = round(0.7 * ats + 0.3 * coverage)

    return {
        "ats_score": final_score,
        "summary": summary,
        "required_keywords": required,
        "matched_keywords": matched,
        "missing_keywords": missing,
        "formatting_issues": data.get("formatting_issues", []),
        "strengths": data.get("strengths", []),
        "improvements": data.get("improvements", []),
        "keyword_coverage": coverage,
    }


def generate_interview_questions(
    role: str, interview_type: str, count: int = 6, difficulty: str = "Medium"
) -> list[str]:
    """Generate role-specific mock interview questions."""
    prompt = (
        f"Generate {count} relevant interview questions for the job role: {role}.\n"
        f"Interview type: {interview_type}.\n"
        f"Difficulty level: {difficulty}.\n\n"
        f"Tune the questions to the {difficulty} difficulty — {difficulty.lower()} questions should be "
        f"{'fundamental and approachable' if difficulty.lower() in ('easy', 'beginner') else ('tricky, multi-layer and require deep expertise' if difficulty.lower() in ('hard', 'difficult', 'expert') else 'balanced, practical and at an intermediate level')}.\n"
        "Return a valid JSON object with exactly this shape:\n"
        '{\n  "questions": ["question 1", "question 2", ...]\n}\n'
        "The questions should be specific to the role and realistic for an actual "
        "interview. Do not include any text outside the JSON object."
    )
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=1500,
    )
    data = _parse_json(text, {"questions": []})
    questions = data.get("questions", [])
    if not isinstance(questions, list):
        questions = []
    clean = [str(q) for q in questions if str(q).strip()]
    return clean[: count + 2]


def evaluate_interview_answers(role: str, qa: list[dict]) -> dict:
    """Evaluate a candidate's answers and return per-answer scores/feedback."""
    if not qa:
        return {"answers": [], "overall_feedback": ""}
    transcript = "\n".join(
        f"Q: {item['question']}\nA: {item.get('answer', '')}" for item in qa
    )
    prompt = (
        f"Evaluate these mock interview answers for the role: {role}.\n\n"
        f"{transcript}\n\n"
        "Return a valid JSON object with exactly this shape:\n"
        "{\n"
        '  "answers": [\n'
        "    {\n"
        '      "question": "<the question>",\n'
        '      "score": <integer 0-100>,\n'
        '      "feedback": "<2-3 sentence constructive feedback>"\n'
        "    }\n"
        "  ],\n"
        '  "overall_feedback": "<2-3 sentence overall performance summary>"\n'
        "}\n"
        "Score each answer 0-100 based on relevance, clarity, structure and depth. "
        "Be specific and constructive. Do not include any text outside the JSON object."
    )
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=2500,
    )
    data = _parse_json(text, {"answers": [], "overall_feedback": ""})
    answers = data.get("answers", [])
    if not isinstance(answers, list):
        answers = []
    normalized = []
    for a in answers:
        if not isinstance(a, dict):
            continue
        score = a.get("score", 0)
        try:
            score = max(0, min(100, int(score)))
        except (TypeError, ValueError):
            score = 0
        normalized.append(
            {
                "question": str(a.get("question", "")),
                "score": score,
                "feedback": str(a.get("feedback", "")),
            }
        )
    return {
        "answers": normalized,
        "overall_feedback": str(data.get("overall_feedback", ""))[:2000],
    }


def generate_better_answers(role: str, qa: list[dict]) -> list[dict]:
    """Generate an example 'better answer' for each question in a past interview."""
    if not qa:
        return []
    transcript = "\n".join(
        f"Q{i + 1}: {item['question']}\nCandidate's answer: {item.get('answer') or '(not answered)'}"
        for i, item in enumerate(qa)
    )
    prompt = (
        f"For the job role: {role}, provide a model 'better answer' for each question.\n\n"
        f"INTERVIEW:\n{transcript}\n\n"
        "Return a valid JSON object with exactly this shape:\n"
        "{\n"
        '  "better_answers": [\n'
        "    {\n"
        '      "question": "<the question>",\n'
        '      "better_answer": "<a strong, model answer to this question>"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "The better_answer should be a well-structured, concrete and realistic example "
        "response an excellent candidate would give, roughly 120-250 words. Do not include "
        "any text outside the JSON object."
    )
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=3000,
    )
    data = _parse_json(text, {"better_answers": []})
    items = data.get("better_answers", [])
    if not isinstance(items, list):
        items = []
    result = []
    for a in items:
        if not isinstance(a, dict):
            continue
        q = str(a.get("question", "")).strip()
        b = str(a.get("better_answer", "")).strip()
        if q and b:
            result.append({"question": q, "better_answer": b})
    return result


def generate_cover_letters(
    job_posting: str,
    context: dict,
    count: int = 3,
    tone: str = "professional",
    variation: int = 0,
) -> list[dict]:
    """Generate multiple personalized cover letter versions for a job posting."""
    experience = context.get("experience") or []
    education = context.get("education") or []
    exp_text = "\n".join(f"- {e}" for e in experience) if experience else "None listed"
    edu_text = "\n".join(f"- {e}" for e in education) if education else "None listed"

    tone_map = {
        "professional": "Professional, formal and confident",
        "creative": "Creative, warm and expressive",
        "bold": "Bold, assertive and achievement-focused",
    }
    tone_desc = tone_map.get(tone.lower(), f"{tone}")

    variation_note = ""
    if variation > 0:
        variation_note = (
            f"This is regeneration attempt #{variation}. Product a FRESH, DIFFERENT set of "
            "cover letters that use a new opening line, new sentence structure and a "
            "different narrative angle than any previous attempt. Do not repeat or rephrase "
            "the earlier versions.\n\n"
        )

    prompt = (
        f"Write a personalized cover letter for this job posting.\n\n"
        f"JOB POSTING:\n{job_posting[:8000]}\n\n"
        f"CANDIDATE PROFILE:\n"
        f"- Name: {context.get('name') or 'The Candidate'}\n"
        f"- Headline: {context.get('headline') or 'N/A'}\n"
        f"- Bio: {context.get('bio') or 'N/A'}\n"
        f"- Skills: {', '.join(context.get('skills') or []) or 'none listed'}\n"
        f"- Experience:\n{exp_text}\n"
        f"- Education:\n{edu_text}\n\n"
        f"{variation_note}"
        f"Generate {count} distinct cover letter versions, each with a different tone "
        f"(e.g. Professional, Enthusiastic, Results-driven). Every version must be "
        "250-350 words, addressed to the hiring manager, personalized to the candidate's "
        "real skills and experience, and reference key requirements from the job posting.\n\n"
        f"The user's desired tone is: {tone_desc}. Make the FIRST version{"s" if count > 1 else ""} "
        "match that desired tone exactly.\n\n"
        "Return a valid JSON object with exactly this shape:\n"
        "{\n"
        '  "versions": [\n'
        "    {\n"
        '      "tone": "<tone name>",\n'
        '      "content": "<full cover letter text>"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Do not include any text outside the JSON object."
    )
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
        max_tokens=2200,
    )
    data = _parse_json(text, {"versions": []})
    versions = data.get("versions", [])
    if not isinstance(versions, list):
        versions = []
    result = []
    for v in versions:
        if not isinstance(v, dict):
            continue
        content = str(v.get("content", "")).strip()
        if not content:
            continue
        result.append({"tone": str(v.get("tone", "Cover Letter")), "content": content})
    return result


def generate_salary_insights(role: str, location: str) -> dict:
    """Estimate salary ranges, market demand and top hiring companies for a role."""
    prompt = (
        f"Provide realistic salary and market insights for the role: {role} in {location}.\n\n"
        "Return a valid JSON object with exactly this shape:\n"
        "{\n"
        '  "role": "<role>",\n'
        '  "location": "<location>",\n'
        '  "currency": "<USD | EUR | GBP | PKR | INR | ...>",\n'
        '  "junior": {"min": <integer>, "max": <integer>, "note": "<short note>"},\n'
        '  "mid": {"min": <integer>, "max": <integer>, "note": "<short note>"},\n'
        '  "senior": {"min": <integer>, "max": <integer>, "note": "<short note>"},\n'
        '  "market_demand": "<High | Medium | Low>",\n'
        '  "demand_percent": <integer 0-100>,\n'
        '  "demand_description": "<1-2 sentence market outlook>",\n'
        '  "top_companies": ["company", ...],\n'
        '  "trend_note": "<1-2 sentence trend/skill note>"\n'
        "}\n"
        "Use annual salary figures for the given location and currency. Provide 5-8 top "
        "companies hiring for this role in that location. Do not include any text outside "
        "the JSON object."
    )
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=1800,
    )
    data = _parse_json(text, {})

    def _level(key):
        level = data.get(key, {})
        if not isinstance(level, dict):
            level = {}
        low, high = level.get("min", 0), level.get("max", 0)
        try:
            low, high = int(low), int(high)
        except (TypeError, ValueError):
            low, high = 0, 0
        if low > high:
            low, high = high, low
        return {
            "min": low,
            "max": high,
            "note": str(level.get("note", "")),
        }

    demand = str(data.get("market_demand", "Medium")).lower()
    if demand not in ("high", "medium", "low"):
        demand = "medium"
    demand_percent = data.get("demand_percent", 0)
    try:
        demand_percent = max(0, min(100, int(demand_percent)))
    except (TypeError, ValueError):
        demand_percent = 0

    companies = data.get("top_companies", [])
    if not isinstance(companies, list):
        companies = []

    return {
        "role": role,
        "location": location,
        "currency": str(data.get("currency", "USD")),
        "junior": _level("junior"),
        "mid": _level("mid"),
        "senior": _level("senior"),
        "market_demand": demand.capitalize(),
        "demand_percent": demand_percent,
        "demand_description": str(data.get("demand_description", "")),
        "top_companies": [str(c) for c in companies],
        "trend_note": str(data.get("trend_note", "")),
    }


def analyze_linkedin(profile_text: str) -> dict:
    """Analyze a pasted LinkedIn profile for completeness and quality."""
    prompt = (
        "Analyze this LinkedIn profile for completeness and quality.\n\n"
        f"PROFILE:\n{profile_text[:12000]}\n\n"
        "Return a valid JSON object with exactly these keys:\n"
        "{\n"
        '  "completeness_score": <integer 0-100>,\n'
        '  "summary": "<2-3 sentence overall assessment>",\n'
        '  "missing_sections": ["section", ...],\n'
        '  "present_sections": ["section", ...],\n'
        '  "headline_suggestions": ["improved headline example", ...],\n'
        '  "keyword_improvements": ["specific keyword to add", ...],\n'
        '  "strengths": ["strength", ...]\n'
        "}\n"
        "Do not include any text outside the JSON object."
    )
    text = _llm_call(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=2000,
    )
    data = _parse_json(text, {})

    score = data.get("completeness_score", 0)
    try:
        score = max(0, min(100, int(score)))
    except (TypeError, ValueError):
        score = 0
    for key in (
        "missing_sections",
        "present_sections",
        "headline_suggestions",
        "keyword_improvements",
        "strengths",
    ):
        if not isinstance(data.get(key), list):
            data[key] = []
    return {
        "completeness_score": score,
        "summary": str(data.get("summary", ""))[:1500],
        "missing_sections": data["missing_sections"],
        "present_sections": data["present_sections"],
        "headline_suggestions": data["headline_suggestions"],
        "keyword_improvements": data["keyword_improvements"],
        "strengths": data["strengths"],
    }


def generate_summary(history: list[dict]) -> str:
    """Generate a compact long-term-memory summary of a conversation."""
    transcript = "\n".join(f"{m['role']}: {m['content']}" for m in history)
    prompt = (
        "Summarize this career-mentor conversation into 2-4 concise lines of durable "
        "memory (facts, goals, preferences, decisions and any detail worth remembering "
        "later). Keep it specific and factual. Do not add anything that wasn't discussed.\n\n"
        f"Conversation:\n{transcript}"
    )
    try:
        text = _llm_call(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=400,
        )
        return (text or "").strip()[:1000]
    except Exception:
        return ""