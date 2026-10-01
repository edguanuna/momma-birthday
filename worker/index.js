// Froggy Party image generator.
// Takes an uploaded photo, adds Momma's reference photos and a hard-coded prompt,
// asks OpenAI to make the image, and sends it back to the site.

const SCENES = [
  "leading a charge against shadowy cabal figures in suits outside a burning Capitol at sunset, helicopters overhead",
  "storming the gates of Area 51 while aliens flee from a crashed flying saucer",
  "defusing a giant glowing nuclear bomb labeled CABAL with one second left on the timer",
  "standing victorious on a hill overlooking a sunrise city with the whole Earth glowing in the sky",
  "fighting off giant armored riot-shield monsters labeled LIES, CORRUPTION and CENSORSHIP with a glowing golden sword",
  "zip-lining off the Eiffel Tower at night while hooded secret-society figures shake their fists below",
  "busting into the Illuminati pyramid's throne room with flags waving",
  "escaping the Bermuda Triangle on a speedboat while a kraken bursts out of a glowing whirlpool",
  "exposing that birds aren't real, holding a robot pigeon with its battery panel open, in front of a red-string conspiracy board",
  "celebrating victory at a huge backyard birthday cookout with balloons, a HAPPY BIRTHDAY banner and fireworks after saving the world",
];

const STYLE =
  "Bold digital comic-book poster art: dramatic lighting, thick inked outlines, rich saturated colors, " +
  "epic heroic movie-poster energy that is also fun and funny. Include several Pepe the Frog style cartoon frogs " +
  "(green frog, big droopy eyes, wide brown-red lips), some in tactical gear, some in party hats, fighting alongside the heroes. " +
  "American flags and patriotic touches are welcome. No extra text except signs or labels that fit the scene.";

function buildPrompt(scene, mommaCount) {
  const mommaImgs = mommaCount === 1 ? "image 1" : `images 1-${mommaCount}`;
  const guestImg = `image ${mommaCount + 1}`;
  return (
    `Create one new illustration with exactly two human heroes plus a squad of frogs. ` +
    `Hero 1 is the woman shown in ${mommaImgs} ("Momma"): keep her face, age, hair and likeness clearly recognizable; ` +
    `dress her in a red-and-white striped shirt with denim overalls. ` +
    `Hero 2 is the person shown in ${guestImg}: keep their face and likeness clearly recognizable, ` +
    `and dress them in a matching heroic outfit. Both are smiling and confident, side by side, as equal heroes. ` +
    `Scene: the two heroes and the frog squad are ${scene}. ${STYLE}`
  );
}

function cors(origin, env) {
  const allowed = env.ALLOWED_ORIGINS.split(",").map(s => s.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

export default {
  async fetch(request, env) {
    const headers = cors(request.headers.get("Origin") || "", env);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST") return json({ error: "Ribbit. POST a photo here." }, 405, headers);

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ error: "Couldn't read the upload." }, 400, headers);
    }

    if (env.PARTY_PASSWORD && (form.get("password") || "").trim().toLowerCase() !== env.PARTY_PASSWORD.toLowerCase()) {
      return json({ error: "Wrong secret frog word." }, 401, headers);
    }

    const photo = form.get("photo");
    if (!photo || typeof photo === "string") return json({ error: "No photo uploaded." }, 400, headers);
    if (photo.size > 8 * 1024 * 1024) return json({ error: "That photo is too big (max 8 MB)." }, 413, headers);

    const refs = env.MOMMA_REFS.split(",").map(s => s.trim()).filter(Boolean);
    const mommaPics = await Promise.all(refs.map(async (url, i) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Momma reference missing: ${url}`);
      return new File([await r.arrayBuffer()], `momma-${i + 1}.jpg`, { type: r.headers.get("Content-Type") || "image/jpeg" });
    })).catch(e => e);
    if (mommaPics instanceof Error) return json({ error: mommaPics.message }, 500, headers);

    const scene = SCENES[Math.floor(Math.random() * SCENES.length)];
    const body = new FormData();
    body.append("model", env.MODEL);
    body.append("prompt", buildPrompt(scene, mommaPics.length));
    body.append("size", "1024x1024");
    body.append("quality", env.QUALITY);
    mommaPics.forEach(f => body.append("image[]", f));
    body.append("image[]", new File([photo], "guest.jpg", { type: photo.type || "image/jpeg" }));

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.data?.[0]?.b64_json) {
      const msg = data.error?.message || `OpenAI error ${res.status}`;
      console.log("openai error", res.status, msg);
      return json({ error: msg }, 502, headers);
    }

    return json({ image: data.data[0].b64_json, scene }, 200, headers);
  },
};
