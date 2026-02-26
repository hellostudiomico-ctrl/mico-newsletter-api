import type { VercelRequest, VercelResponse } from "@vercel/node"

const MJ_API  = process.env.MAILJET_API_KEY
const MJ_SEC  = process.env.MAILJET_API_SECRET
const MJ_LIST = process.env.MAILJET_LIST_ID

function mjAuth() {
    return "Basic " + Buffer.from(`${MJ_API}:${MJ_SEC}`).toString("base64")
}

async function mj(path: string, method: string, body?: unknown) {
    return fetch(`https://api.mailjet.com/v3/REST/${path}`, {
        method,
        headers: {
            Authorization: mjAuth(),
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end()
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

    const { email, name, firstName, phone, type } = req.body || {}

    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email required" })
    }

    const emailClean = email.trim().toLowerCase()
    const fullName   = [firstName, name].filter(Boolean).join(" ").trim()

    try {
        const contactRes = await mj("contact", "POST", {
            Email: emailClean,
            Name: fullName || emailClean,
            IsExcludedFromCampaigns: false,
        })

        if (!contactRes.ok) {
            const err = await contactRes.json().catch(() => ({}))
            const isDuplicate = (err as any)?.StatusCode === 400
            if (!isDuplicate) {
                return res.status(500).json({ error: "Failed to create contact" })
            }
        }

        await mj(`contactdata/${encodeURIComponent(emailClean)}`, "PUT", {
            Data: [
                { Name: "firstname", Value: firstName || "" },
                { Name: "name",      Value: name      || "" },
                { Name: "phone",     Value: phone      || "" },
                { Name: "type",      Value: type       || "" },
            ],
        })

        await mj("listrecipient", "POST", {
            ContactsListID: Number(MJ_LIST),
            Email: emailClean,
            Action: "addnoforce",
        })

        return res.status(200).json({ ok: true })

    } catch (err) {
        console.error("Mailjet error:", err)
        return res.status(500).json({ error: "Subscription failed" })
    }
}
