// Froggy Party image generator.
// Takes an uploaded photo, adds Momma's reference photos and a hard-coded prompt,
// asks OpenAI to make the image, and sends it back to the site.

// One adventure is picked at random per image. Ranges from wholesome to completely unhinged.
// Each entry includes the outfits so the heroes are dressed for the scene.
const SCENES = [
  // out of this world
  "planting a flag on the moon in white NASA spacesuits with helmets off, Earth rising behind them and a lunar rover parked nearby",
  "exploring the red dunes of Mars in dusty astronaut suits next to a rover, a dust storm rolling in",
  "floating weightless inside the International Space Station in blue flight suits, birthday cake crumbs drifting everywhere",
  "piloting a retro rocket ship through an asteroid field in leather flight jackets and goggles",
  // military / action
  "parachuting into the Iraqi desert during Operation Desert Storm in 1991 desert camo, tanks and Black Hawks below, sand blowing",
  "storming the beach of a jungle island in tactical gear and face paint, landing craft and smoke behind them",
  "rappelling out of a helicopter onto a skyscraper rooftop at night in black ops gear, searchlights sweeping",
  "riding a motorcycle through an exploding city street in leather jackets and aviators while shadowy cabal agents chase them",
  "storming the gates of Area 51 in tactical gear while aliens flee from a crashed flying saucer",
  "defusing a giant glowing nuclear bomb labeled CABAL with one second left on the timer, sweaty and grinning",
  // extreme nature
  "summiting Mount Everest in puffy red and blue down suits with ice axes, roped together, prayer flags snapping in the wind",
  "white-water rafting down a raging canyon river in life jackets and helmets, soaked and screaming with joy",
  "skydiving in wingsuits over the Swiss Alps, holding hands in a formation with the frogs",
  "running from a lava flow on an erupting Hawaiian volcano in hiking gear",
  "deep-sea diving in brass old-school diving helmets beside a sunken pirate ship and a curious giant squid",
  "racing dog sleds across the Alaskan tundra under the northern lights in fur parkas",
  "on an African safari riding on top of a herd of giant elephants with Mount Kilimanjaro behind them",
  // history and legends
  "discovering a golden idol in a jungle temple in Indiana Jones style fedoras and khakis, a giant boulder rolling behind them",
  "crossing the Delaware River with George Washington in colonial coats and tricorn hats",
  "riding chariots in a Roman Colosseum race in gladiator armor",
  "sailing a Viking longship through a stormy fjord in horned helmets and furs",
  "sneaking through Egyptian pyramids by torchlight in explorer outfits, mummies waking up",
  // conspiracy chaos
  "leading a charge against shadowy cabal figures in suits outside a burning Capitol at sunset, helicopters overhead",
  "zip-lining off the Eiffel Tower at night in black catsuits while hooded secret-society figures shake their fists below",
  "busting into the Illuminati pyramid's throne room in trench coats with flags waving",
  "escaping the Bermuda Triangle on a speedboat while a kraken bursts out of a glowing whirlpool",
  "exposing that birds aren't real, holding a robot pigeon with its battery panel open, in front of a red-string conspiracy board",
  "catching Bigfoot on camera in a misty Pacific Northwest forest in flannel and hunting caps",
  // pure fun
  "winning the NBA finals in matching TEAM BETTER TOMORROW jerseys, confetti falling in a packed arena",
  "racing in a NASCAR pit stop in matching racing suits, the frogs changing the tires",
  "on a cross-country road trip in a muddy Jeep on a cliffside coastal highway at sunset, wind in their hair",
  "celebrating victory at a huge backyard birthday cookout with balloons, a HAPPY BIRTHDAY banner and fireworks after saving the world",
];

const STYLE =
  "Bold, cinematic digital painting in the style of an epic adventure movie poster: dramatic lighting, rich saturated colors, " +
  "fun and funny energy. Include two or three Pepe the Frog style cartoon frogs (green frog, big droopy eyes, wide brown-red lips) " +
  "taking part in the adventure, dressed for the scene just like the heroes. " +
  "No extra text except signs, banners or labels that fit the scene.";

function buildPrompt(scene, mommaCount) {
  const mommaImgs = mommaCount === 1 ? "image 1" : `images 1-${mommaCount}`;
  const guestImg = `image ${mommaCount + 1}`;
  return (
    `Create one new illustration with exactly two human heroes plus a few frogs. ` +
    `Hero 1 is the woman shown in ${mommaImgs} ("Momma"): keep her face, age, long wavy hair and likeness clearly recognizable. ` +
    `Hero 2 is the person shown in ${guestImg}: keep their face and likeness clearly recognizable. ` +
    `Dress both heroes for the scene (Momma's signature red-and-white striped shirt can peek through when it fits). ` +
    `Both are smiling, confident and having the time of their lives, side by side as equal heroes. ` +
    `Scene: the two heroes and the frogs are ${scene}. ${STYLE}`
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
