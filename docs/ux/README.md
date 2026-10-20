# Cinematic UX concept plates

[UX_DESIGN.md](../../UX_DESIGN.md) defines the interaction contract and embeds the twelve selected plates. Each plate pairs a wide desktop view with a separately composed portrait phone view. These are generated visual proposals, not running application screenshots or measured accessibility results.

The built-in image generation tool created these assets using the approved [cinematic art board](../art/images/b-cinematic.png) for leader anatomy, materials, lighting and planetary atmosphere. [prompts.json](prompts.json) records each exact generation prompt, selected output and any targeted correction. `references/` preserves superseded inputs to those corrections; only the outputs named in the manifest are selected concepts.

The written design governs exact control labels, resources, rules, state transitions and responsive behavior. Incidental generated symbols and lettering are not implementation requirements. Production renders semantic text and controls separately from scene art. Numeric examples illustrate layout rather than balance decisions.

The repository [GPL-3.0-only license](../../LICENSE) applies. No images from other projects are copied into this set.

## Visual review notes

The selected plates establish composition; final interface lettering remains governed by the UX contract. The return plate retains an incidental “Orbital Habitat” subtitle beneath Navigation level 3: production uses “Research completed” there. The diplomacy rail includes an explanatory sentence about time that belongs in help, not the final rail. The phone research view compresses technology choices into icons; production provides visible names through the expanded selector. Generated title lettering and repeated map labels are replaced by exact semantic text. These are known concept-image limitations, not additional mechanics or accepted accessibility exceptions.
