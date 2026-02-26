import type { VercelRequest, VercelResponse } from "@vercel/node"

const RESEND_KEY = process.env.RESEND_API_KEY
const TO_EMAIL   = "hello.studiomico@gmail.com"

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end()
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

    const { name, email, subject, message, services } = req.body || {}

    if (!email || !message) {
        return res.status(400).json({ error: "Email and message required" })
    }

    const servicesList = Array.isArray(services) && services.length
        ? services.join(", ") : ""

    const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#a0ff62;background:#111;padding:16px;border-radius:8px;margin:0 0 20px">
                ✉️ New message — Mico Studio
            </h2>
            <table style="width:100%;border-collapse:collapse">
                <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;width:120px">From</td>
                    <td style="padding:8px 0;border-bottom:1px solid #eee"><strong>${name || "—"}</strong> &lt;${email}&gt;</td>
                </tr>
                ${subject ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Subject</td><td style="padding:8px 0;border-bottom:1px solid #eee">${subject}</td></tr>` : ""}
                ${servicesList ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Services</td><td style="padding:8px 0;border-bottom:1px solid #eee">${servicesList}</td></tr>` : ""}
            </table>
            <div style="margin-top:20px;padding:16px;background:#f9f9f9;border-radius:8px;white-space:pre-wrap">${message}</div>
            <p style="margin-top:20px;font-size:12px;color:#999">Sent from mico.studio</p>
        </div>
    `

    try {
        const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from:     "Mico Studio <onboarding@resend.dev>",
                to:       [TO_EMAIL],
                reply_to: email,
                subject:  subject || `New message from ${name || email}`,
                html,
            }),
        })

        if (!r.ok) {
            const err = await r.json().catch(() => ({}))
            console.error("Resend error:", err)
            return res.status(500).json({ error: "Send failed" })
        }

        return res.status(200).json({ ok: true })

    } catch (err) {
        console.error("Email error:", err)
        return res.status(500).json({ error: "Send failed" })
    }
}
