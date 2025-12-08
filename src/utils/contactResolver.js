// src/utils/contactResolver.js
async function resolveContact(client, wid_from) {
    let wid = wid_from;
    const isLid = wid_from && (wid_from.includes("@lid") || wid_from.includes("@s.whatsapp.net"));

    if (isLid) {
        try {
            const res = await client.getContactLidAndPhone([wid_from]);
            if (res && res[0] && res[0].pn) {
                wid = res[0].pn;
            }
        } catch (err) {}
    }

    if (!wid) wid = wid_from;

    if (wid.endsWith("@g.us") || wid.endsWith("@broadcast")) {
        return { id: { _serialized: wid }, number: wid.replace(/@(.*)/, ""), pushname: null, name: null };
    }

    try { await client.isRegisteredUser(wid); } catch {}
    try { await client.getProfilePicUrl(wid); } catch {}

    let contact = null;
    try { contact = await client.getContactById(wid); } catch {}

    if (!contact && client.contacts) { contact = client.contacts.get(wid); }

    if (!contact) {
        contact = { id: { _serialized: wid }, number: wid.replace("@c.us", ""), pushname: null, name: null };
    }
    return contact;
}
module.exports = resolveContact;