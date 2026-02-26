import type { VercelRequest, VercelResponse } from "@vercel/node"

const BREVO_KEY = process.env.BREVO_API_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end()
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

    const { email, name, firstName, phone, type } = req.body || {}

    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email required" })
    }

    const emailClean = email.trim().toLowerCase()

    try {
        const r = await fetch("https://api.brevo.com/v3/contacts", {
            method: "POST",
            headers: {
                "api-key": BREVO_KEY!,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: emailClean,
                attributes: {
                    FIRSTNAME: firstName || "",
                    LASTNAME:  name      || "",
                    PHONE:     phone     || "",
                    TYPE:      type      || "",
                },
                listIds: [5],
                updateEnabled: true,
            }),
        })

        if (!r.ok) {
            const err = await r.json().catch(() => ({}))
            console.error("Brevo error:", err)
            return res.status(500).json({ error: "Subscription failed" })
        }

        return res.status(200).json({ ok: true })

    } catch (err) {
        console.error("Brevo error:", err)
        return res.status(500).json({ error: "Subscription failed" })
    }
}
