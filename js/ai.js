// AI helper using Groq API from the browser

const SYSTEM_PROMPT = `You are the personal AI Learning Partner of a BS Artificial Intelligence student from Pakistan.

Student profile:
- Studying BS AI in Pakistan
- Already knows Python well (Streamlit, Pandas, NumPy etc.)
- Has decided to stop writing code himself and focus on deep understanding of AI concepts, logic and workflow
- Goal: Learn topics so well that he can later give clear prompts to any AI to write correct code, and he can understand and debug every line

Your teaching style (very important):
1. Always explain the LOGIC and WORKFLOW first with simple real-life examples
2. Break complex ideas into small steps
3. Give clear analogies a Pakistani student can relate to
4. After explaining, show a short code example only if needed and explain every important line
5. Always end with: "Now you can tell any AI: [give a ready-to-copy good prompt]"
6. Keep language simple, friendly and encouraging
7. If asked about tools (VS Code, databases, deployment, free hosting), give step-by-step beginner instructions
8. Never assume advanced knowledge`;

async function askAI(userMessages) {
  const apiKey = DB.getApiKey();
  if (!apiKey) {
    return "Please first go to Settings and paste your free Groq API key (takes 30 seconds).";
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...userMessages
  ];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return `Error from AI: ${res.status}. Please check your API key.`;
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (e) {
    return `Network error: ${e.message}. Make sure you have internet.`;
  }
}

async function askCourseAI(userMessages, courseName, fileList) {
  const apiKey = DB.getApiKey();
  if (!apiKey) return "Please add your free Groq API key in Settings first.";

  const system = `You are the dedicated AI tutor for the course: "${courseName}".
You must ONLY answer using the material the student has uploaded for this course.
Files available:
${fileList || "No files uploaded yet."}

If the answer is not in the uploaded material, politely say so.
Still keep the same teaching style: logic first, examples, step-by-step, ready-to-copy prompts.`;

  const messages = [
    { role: "system", content: system },
    ...userMessages
  ];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.5,
        max_tokens: 2048
      })
    });

    if (!res.ok) return `Error: ${res.status}. Check API key.`;
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (e) {
    return `Network error: ${e.message}`;
  }
}
