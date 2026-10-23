# Production asset provenance

The entry and identity artwork was generated for Cluster on 2026-10-20 with OpenAI image generation. The approved [entry composition](../ux/concepts/01-entry.png) supplied the desktop and phone reference. The original generated PNGs are retained in [source](source/); composition is preserved in the quality-88/90 WebP encodings under `static/art/`. Portraits use a four-by-two CSS atlas with semantic radio controls. Text, buttons, focus, selection, and state are rendered by the application.

No predecessor application code or portrait artwork is copied. The eight portrait IDs preserve the existing identity vocabulary. Cormorant Garamond and Atkinson Hyperlegible are distributed by the pinned Fontsource packages under their included SIL Open Font Licenses.

## Desktop prompt

Create a production background asset for the Cluster strategy game. Reference image role: approved entry screen composition and cinematic realism style. Generate ONE complete widescreen landscape 2560x1440 scene, NOT the side-by-side comparison. Recreate the LEFT view as a clean background: older dark-skinned female diplomat with short silver curls and ochre high-collar robes standing at far left of a grand observatory window, looking over a spectacular inhabited blue planet horizon, orbital ships, spiral galaxy high overhead, polished brass-and-gunmetal orrery along the lower edge. Keep leader in left 25 percent; central 40-78 percent of frame has quiet dark blue space above the planet for semantic title and controls added by code. Retain sumptuous physically believable golden sunrise, navy space, ivory clouds, realistic materials, photographic game art fidelity. Remove ALL lettering, wordmarks, logos, icons, borders, button panels, interface and split-screen divisions. No text anywhere. This is scenery only, with center unobstructed and high detail at edges.

## Phone prompt

Production background art for Cluster game. Reference is approved entry UX composition; generate ONLY ONE portrait 1024x1792 scene matching the RIGHT mobile composition, no split screen. Cinematic realism: immense inhabited blue planet horizon in the middle, distant golden-white sunrise at right, spiral galaxy near upper third, a small moon upper left and a few orbital ships. Deep navy star field leaves ample QUIET space in top 20 percent for title and bottom 40 percent for real UI controls. Believable oceans, clouds and tiny coastal cities across planet. No leader or observatory foreground in this phone version. Rich photographic cinematic detail, restrained light, navy and warm ivory palette. Absolutely NO text, logos, UI panels, buttons, icons, borders, watermark, or lettering; this is scenery only.

## Portrait atlas prompt

Create a production portrait atlas for a cinematic realistic space diplomacy game, Cluster. Exactly EIGHT equal square head-and-shoulders portraits in a precise 4 column by 2 row grid, no margins, no gutters, no text, no icons, no decorative frames. Each tile has its subject centered fully within its own tile on dark navy space background. Row 1: older dark-skinned woman with short silver curls in ochre ambassador robes; East Asian man with black hair in ivory diplomatic uniform; elegant iridescent aquatic alien with blue-green fins and golden eyes; aquatic alien with violet translucent skin and luminous teal details. Row 2: sophisticated insectoid ambassador with amber chitin and fine mandibles; insectoid with pearl exoskeleton and jewel green eyes; regal reptilian commander with deep rust scales and brass collar; reptilian diplomat with slate blue scales and silver collar. Photographic game art, physically plausible materials, warm side lighting, serious measured expressions, refined realism, no weapons. Each portrait is independently framed inside exactly one tile. Output landscape aspect ratio 2:1, ideally 2048x1024.

## Illustrated entry navigation

Source: `docs/art/source/entry-navigation.png`; served atlas: `static/art/entry-navigation.webp` (WebP quality 88). Created with built-in imagegen on 2026-10-20. Two equal square insets, selected by the shared EntryButton component; text and focus/interaction remain semantic HTML. Reviewed output: blue planet left, bronze observatory right, no lettering. No existing source was replaced.

Exact generation prompt:

> Use case: stylized-concept. Production asset for a cinematic space diplomacy game's illustrated navigation buttons. Create one wide 2:1 atlas with exactly TWO equal square panels side by side, edge to edge, no gutters or borders. Left square: a photorealistic blue-gray rocky planet, its curved sunlit crescent along the upper left, lower hemisphere in deep shadow, against black space with sparse fine stars. Planet fills 85% of square. Right square: majestic bronze and dark stone observatory library interior, tall arched windows revealing faint stars, vaulted ceiling and warm gold sunlight on intricate astronomical instruments, no people. Rich cinematic physical materials, restrained warm gold and midnight navy palette, clear readable silhouettes even at 90px. NO text, letters, logos, UI, frames, buttons, symbols, captions, watermarks. Two independent square illustrations, planet on left and observatory on right.

## Faction envoy atlas

Source: `docs/art/source/faction-envoys.png`; served atlas: `static/art/faction-envoys.webp` (WebP quality 90). Generated with built-in imagegen on 2026-10-20. Four square portraits supply the actual faction selector; labels, quota states and affinity numbers remain semantic HTML. The galaxy uses production Three.js geometry and an analytic radial glow texture, not a scene screenshot. Proper star names are preserved from Cluster I's `cluster/functions/src/common/starnames.ts`; generation and presentation code are new.

Exact generation prompt:

> Use case: stylized-concept. Production faction-selection artwork for Cluster, a cinematic photorealistic space diplomacy game. ONE square image made of an exact 2 by 2 atlas of four independent equal square portraits, no gaps, no frames, no text. Each square: commanding upper-body civilization leader in foreground with a futuristic orbital observatory and a planet horizon behind, immaculate physical detail, dignified diplomacy rather than combat, gold and midnight navy accents. Top left: graceful amphibious aquatic envoy with teal iridescent skin and translucent fin-like head crest, silver ceremonial clothing. Top right: older Black human woman with short natural silver curls, gold ivory high-collar diplomatic robe, wise confident expression. Bottom left: elegant insectoid envoy with articulate chitin, long fine antennae, violet and bronze shell, ornate robes. Bottom right: imposing red-brown reptilian leader with scaled crest, dark bronze ceremonial armour. Faces near the upper center of each cell, upper body extending to bottom. Distinct individual real-looking environments, no lettering, no symbols, no UI, no captions, no watermark, no extra faces. Exactly four evenly sized square panels. Lighting luminous cinematic rim light from the planetary horizon.

## Galactic dust plane

Source: `docs/art/source/galaxy-dust.png`; served texture: `static/art/galaxy-dust.webp` (quality 90). Generated on 2026-10-20. The production renderer places this diffuse artwork on the galactic plane behind authoritative, interactive star geometry. Decorative dust contains no selectable system positions or private state. Orbiting moves the actual plane and markers together; all names, classes, selection and ownership come from authorized campaign data.

Exact generation prompt:

> Production environment texture for Cluster, a cinematic realistic space strategy game. One square image, a perfectly FACE-ON spiral galaxy viewed from directly above its flat disc, no tilt or perspective. Fine smoky navy and cobalt interstellar dust in loose intricate spiral arms around a soft warm ivory-gold center, dark branching dust lanes, photographic Hubble-like delicate detail. The galaxy fills 90 percent of image. Its edge fades smoothly into pure black. The scene must be understated and dark enough for bright interactive star markers to be drawn separately in code. No large individual stars or planets, no pinpoint flares, no ships, no text, no UI, no symbols, no labels, no borders. This is only diffuse galactic dust and luminous unresolved star clouds, not a game map or individual selectable systems. Rich layered depth, cinematic realism, restrained bronze gold and midnight blue palette. Square high resolution texture.

## Stellar class atlas

Source: `docs/art/source/stellar-classes.png`; served atlas: `static/art/stellar-classes.webp` (quality 90). Generated on 2026-10-20 for the actual selected-system inspector. StellarArt supplies the same four illustrations to production and gallery, with semantic class labels. These are class illustrations, not observations of planets or hidden developments.

Exact generation prompt:

> Production stellar illustration atlas for a cinematic realistic space strategy game, Cluster. ONE square image with an exact 2 by 2 grid of equal square panels, no gutters, no borders, no text. Each panel is a different close-up photographically realistic luminous star floating in very dark navy space with delicate atmospheric plasma and faint dust. Top left: small deep coral-red M-class star with low red prominences. Top right: warm golden-white G-class sun with turbulent granular luminous surface and graceful corona. Bottom left: brilliant pearl-white A-class star with pale violet corona. Bottom right: intense electric blue O-class star with expansive blue-white corona. Each entire stellar disc centered and fully contained in its own panel, filling about 55 percent of panel diameter, different believable surface textures, physically inspired cinematic science illustration. NO planets, ships, maps, labels, letters, figures, UI, symbols or watermarks. Exactly four independent square star illustrations. Midnight blue, ivory, bronze gold palette.

## Construction environments

Generated on 2026-10-20 with the built-in imagegen tool. Production selection uses four distinct full-bleed illustrations, encoded as WebP quality 90 in `static/art/construction-{market,camp,base,station}.webp`. The shared SystemConstruction component uses the same assets in the player interface, gallery and animation lab. Architectural imagery conveys development type; it is not sensor intelligence, authoritative geography, or a claim about hidden structures. All labels, prices and actions are semantic UI, never generated lettering.

Market prompt:

> Use case: stylized-concept. Production game asset for Cluster, cinematic sophisticated space conquest strategy. Generate a wide landscape illustration of a futuristic planetary MARKET: elegant circular white limestone and brushed brass trade pavilion, sweeping shade canopies, tiny diverse fully clothed merchants, terraces and sunlit mountains, lush but restrained greenery, huge orbital arc faintly visible in blue sky. Realistic painterly premium game key art, navy shadows, pale gold sunlight, tangible architectural detail. Focal pavilion centered, readable silhouette at thumbnail size, full bleed. No lettering, logos, symbols, captions, interface, borders or watermarks. This is artwork only, not a UI mockup.

Other three exact prompts use this template with the subjects below:

> Use case: stylized-concept. Production game asset for Cluster, cinematic sophisticated space conquest strategy. Generate a wide landscape illustration of SUBJECT. Realistic painterly premium game key art, navy shadows, restrained pale gold sunlight, tangible architectural detail, optimistic grandeur. Focal structure centered, readable silhouette at thumbnail size, full bleed. No lettering, logos, captions, interface, borders or watermarks. This is artwork only, not a UI mockup.

- Camp SUBJECT: a fighter pilot TRAINING CAMP in orbit: long sweeping training station and hangars, several small distinct sleek fighter craft departing in formation, blue-white atmospheric planet beneath, dark space beyond
- Base SUBJECT: a planetary infantry BASE: monumental grounded military academy and fortified landing apron, low pale-stone and dark-metal architecture, tiny fully armored infantry formations, rugged mountain valley, no combat or explosions
- Station SUBJECT: a SCIENCE SPACE STATION: graceful concentric laboratory rings and long delicate telescope instruments, blue-glowing observatory dome, sophisticated white-metal and brass structure above a luminous curved planet

## Development icons

`src/lib/components/DevelopmentIcon.svelte` supplies the production market coin stack, training chevrons, surface base and orbital station symbols. These are original hand-authored SVG paths, licensed with this project under GPL-3.0-only; no external artwork or generated lettering is used. They accompany real labels and expose no intelligence. The gallery enumerates all four symbols, and the market-focus control shares them across production, gallery and animation lab. Its header reuses the provenance-recorded construction market scene.

## Fleet preparation

`static/art/fleet-preparation.webp` is final production hangar/fighter-transport artwork generated with the built-in imagegen tool on 2026-10-21, then encoded as WebP with Sharp at quality 88. Source: `01a15929-99b0-7603-a932-6dda979c98ff/exec-319c506a-5d66-41ec-b36a-999a70247bed.png` under the imagegen output directory. It is shared by the real fleet instrument, gallery and lab; all labels and counts are semantic HTML. `FleetSymbol.svelte` is an original hand-authored SVG mark, licensed GPL-3.0-only with the code. Neither asset implies an additional ship type or combat ability.

Exact generation prompt:

> Use case: stylized-concept. Asset type: final production artwork for Cluster II's fleet preparation instrument, a cinematic space strategy game. Create a wide landscape illustration: a sophisticated fighter spacecraft with integrated infantry transport compartment moored outside an immense orbital hangar, a few companion fighters receding into depth, a luminous blue planetary horizon below. Close three-quarter view of the lead ship; clear readable silhouette, credible layered titanium hull panels and docking structure, restrained cyan engines and warm amber windows. Cinematic realism, richly detailed physically plausible materials, deep midnight navy and bronze/gold palette, atmospheric depth and dramatic rim lighting. Keep primary ship in central two-thirds so the scene crops well to a phone header. This is artwork only, not an interface. Absolutely no text, lettering, numerals, logos, watermark, borders, UI panels, labels or diagrams.

## Orbital aftermath

`static/art/orbital-aftermath.webp` is production combat-report artwork generated with the built-in imagegen tool on 2026-10-21 and encoded with Sharp at WebP quality 88. Source: `01a15929-99b0-7603-a932-6dda979c98ff/exec-bae1caa8-6ec7-456c-86ea-97789f10b423.png`. ArrivalReports shares it across the player interface, gallery and animation lab. The illustration is atmosphere, not evidence of structures, ship counts, planet geography or undisclosed intelligence. All reports, quantities and controls are semantic HTML.

Exact generation prompt:

> Use case: stylized-concept. Asset type: production background illustration for Cluster II space strategy combat report. Wide landscape 3:2 composition, cinematic realistic science fiction matte painting. A vast detailed dark metallic orbital ring station with slender vertical towers floats above a blue-white planet's curved horizon, several sleek compact fighter spacecraft in escort formations, subtle amber navigation lights, deep navy star field. Station occupies upper right two thirds; lower left is dark atmospheric negative space for real UI overlay. Planetary cities and mountains far below, distant moon. Restrained aftermath of a battle, no explosion spectacle. Luxurious mature strategy game art, finely detailed metal, dramatic cool rim lighting and warm dawn. No lettering, numbers, labels, logos, UI, borders, watermark, or implied numerical unit counts. This is atmospheric art, not a diagram or interface mockup.

## Return reports

`BriefingReport.svelte` reuses the existing `galaxy-dust.webp`, stellar atlas, construction market/station illustrations and faction atlas. Artwork is decorative: star class and message-author faction come from the authorized record; all event labels, quantities and inspection actions are semantic HTML. FleetSymbol and DevelopmentIcon remain the shared production marks. No new raster generation or asset provenance is introduced.

## Credit offers

`CreditOffers.svelte` reuses `construction-market.webp` as decorative exchange scenery. Exact terms, participants, balances and outcomes remain semantic HTML text and controls. No generated lettering or new raster asset conveys game state.

## Entry composition alignment

Continue reuses `entry-phone.webp` as a decorative inhabited-world inset, distinct from Play’s planet and Learn’s observatory atlas. No asset bytes changed. Cyan emphasis and exact campaign names are semantic production UI; only accessible active memberships render Continue.
