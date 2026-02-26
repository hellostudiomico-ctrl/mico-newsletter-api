import type { VercelRequest, VercelResponse } from "@vercel/node"

const BREVO_KEY  = process.env.BREVO_API_KEY
const RESEND_KEY = process.env.RESEND_API_KEY
const TO_EMAIL   = "hello.studiomico@gmail.com"

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end()
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

    const {
        name, email, company,
        services, description, script, references,
        budget, duration, deadline, platform,
        voiceover, music,
    } = req.body || {}

    if (!email) return res.status(400).json({ error: "Email required" })

    const servicesList = Array.isArray(services) ? services.join(", ") : (services || "")

    if (BREVO_KEY) {
        try {
            await fetch("https://api.brevo.com/v3/contacts", {
                method: "POST",
                headers: {
                    "api-key": BREVO_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    attributes: {
                        FIRSTNAME:   name        || "",
                        COMPANY:     company     || "",
                        SERVICES:    servicesList,
                        DESCRIPTION: description || "",
                        SCRIPT:      script      || "",
                        REFERENCES:  references  || "",
                        BUDGET:      budget      || "",
                        DURATION:    duration    || "",
                        DEADLINE:    deadline    || "",
                        PLATFORM:    platform    || "",
                        VOICEOVER:   voiceover   || "",
                        MUSIC:       music       || "",
                    },
                    updateEnabled: true,
                }),
            })
        } catch (err) {
            console.error("Brevo error:", err)
        }
    }

    if (RESEND_KEY) {
        const rows = [
            ["Name",        name        || "—"],
            ["Email",       email],
            ["Company",     company     || "—"],
            ["Services",    servicesList || "—"],
            ["Description", description || "—"],
            ["Script",      script      || "—"],
            ["References",  references  || "—"],
            ["Budget",      budget      || "—"],
            ["Duration",    duration    || "—"],
            ["Deadline",    deadline    || "—"],
            ["Platform",    platform    || "—"],
            ["Voiceover",   voiceover   || "—"],
            ["Music",       music       || "—"],
        ]

        const tableRows = rows
            .filter(([, v]) => v !== "—")
            .map(([label, value]) => `
                <tr>
                    <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;width:130px">${label}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #eee">${value}</td>
                </tr>`)
            .join("")

        const html = `
            <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
                <h2 style="color:#fff;background:#111;padding:16px 20px;border-radius:8px;margin:0 0 20px">
                    📋 New project brief — Mico Studio
                </h2>
                <table style="width:100%;border-collapse:collapse;border:1px solid #eee">
                    ${tableRows}
                </table>
                <p style="margin-top:20px;font-size:12px;color:#999">Sent from mico.studio</p>
            </div>
        `

        try {
            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${RESEND_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from:     "Mico Studio <onboarding@resend.dev>",
                    to:       [TO_EMAIL],
                    reply_to: email,
                    subject:  `New brief from ${name || email}${company ? ` — ${company}` : ""}`,
                    html,
                }),
            })
        } catch (err) {
            console.error("Resend error:", err)
        }
    }

    return res.status(200).json({ ok: true })
}
