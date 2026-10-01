# Hapepe Birthday Momma 🐸🎂

A plain static site (HTML/CSS/JS), made for GitHub Pages.

## Add the pictures
- **Solo Mission photos:** put them in `images/solo/` named `01.jpg` … `10.jpg`, or use any names and list them in `photos.js`.
- **Momma for Froggy Party:** save a photo of her as `images/momma.png`. A cut-out with a transparent background looks best, but a regular photo works too. If you use a `.jpg`, update `MOMMA_PHOTO` in `photos.js`.

## Put it on GitHub Pages
1. Create a new repo on GitHub and upload everything in this folder.
2. Go to repo **Settings → Pages**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
3. After a minute it's live at `https://<your-username>.github.io/<repo-name>/`.

## Froggy Party note
GitHub Pages can't safely hold an AI API key, so for now Froggy Party makes a meme collage right in the browser: your photo, Momma, frogs and a random conspiracy mission. Photos never leave the device. Real AI generation can be added later with a small serverless function (for example a Cloudflare Worker) that holds the key.
