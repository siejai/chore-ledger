/*
 * Creature art: every pet is drawn from parts (ears, tail, crest, extras) so new species are data, not art files.
 * CRE.draw(speciesId, stage 0-2, paletteIndex, mood) returns an SVG string (viewBox -6 -34 212 234).
 * Moods: 'ok', 'happy', 'hungry', 'grubby', 'sleepy', 'lazy', 'asleep', 'eat'. ES5.
 */
(function () {
  'use strict';
  var SPECIES = [
    {
      id: 'fox', family: 'classic', type: 'Fire', names: ['Pipkit', 'Flarefox', 'Solvane'],
      blurb: 'A warm little fox. Its tail glows brighter as it grows.',
      ears: 'pointy', tail: 'fluffy', crest: 'flame', muzzle: true,
      palettes: [
        { main: '#f08a3c', dark: '#b4531d', light: '#fff0dc', accent: '#ffcf3f', name: 'Ember' },
        { main: '#e2566e', dark: '#9d2940', light: '#ffe6ea', accent: '#ffb347', name: 'Rose' },
        { main: '#8a6ae6', dark: '#5438a8', light: '#efe9ff', accent: '#ff8fd0', name: 'Dusk' },
        { main: '#f3efe6', dark: '#a79f8e', light: '#ffffff', accent: '#62d9f5', name: 'Frost', rare: true }
      ]
    },
    {
      id: 'otter', family: 'classic', type: 'Water', names: ['Droplet', 'Rippler', 'Tidalor'],
      blurb: 'A playful otter pup. It loves bath time more than anything.',
      ears: 'round', tail: 'paddle', crest: 'drop', muzzle: true,
      palettes: [
        { main: '#4b9fdc', dark: '#22659a', light: '#dff2ff', accent: '#78e0d2', name: 'Lagoon' },
        { main: '#3fb6a8', dark: '#1d7a70', light: '#dcfaf5', accent: '#9fd7ff', name: 'Reef' },
        { main: '#7b8fb0', dark: '#46587a', light: '#eef2f8', accent: '#ffd66b', name: 'Storm' },
        { main: '#f2a7c3', dark: '#b8577e', light: '#fff0f6', accent: '#8fe3ff', name: 'Pearl', rare: true }
      ]
    },
    {
      id: 'bunny', family: 'classic', type: 'Leaf', names: ['Sprig', 'Thicket', 'Verdantis'],
      blurb: 'A sleepy bunny with a sprout on its head. It blooms when it is happy.',
      ears: 'long', tail: 'puff', crest: 'leaf', muzzle: false,
      palettes: [
        { main: '#93cf6c', dark: '#4e8c35', light: '#f3fce7', accent: '#ff9cc5', name: 'Meadow' },
        { main: '#e9d58c', dark: '#a78d33', light: '#fffbe9', accent: '#8bd46b', name: 'Wheat' },
        { main: '#a8c7a0', dark: '#5f7d58', light: '#f2f8ef', accent: '#c59cff', name: 'Sage' },
        { main: '#f6c1dd', dark: '#b96b95', light: '#fff4fa', accent: '#7dd87a', name: 'Blossom', rare: true }
      ]
    },
    {
      id: 'starling', family: 'myth', type: 'Cosmic', rare: true, names: ['Twinkit', 'Stardust', 'Celestine'],
      blurb: 'A rare creature that fell from a shooting star. It glows in the dark and can do a little of everything.',
      ears: 'pointy', tail: 'fluffy', crest: 'star', muzzle: false,
      palettes: [
        { main: '#3d4296', dark: '#22265e', light: '#dfe3ff', accent: '#ffd84a', name: 'Midnight' },
        { main: '#f3f0ff', dark: '#9a8fd6', light: '#ffffff', accent: '#8fe3ff', name: 'Moonlight' },
        { main: '#2b2233', dark: '#120d18', light: '#b9a8e8', accent: '#ff8fd0', name: 'Nebula', rare: true }
      ]
    }
  ];
  function pal(main, dark, light, accent, name, rare) { var o = { main: main, dark: dark, light: light, accent: accent, name: name }; if (rare) o.rare = true; return o; }
  function sp(id, type, names, blurb, parts, palettes) { var o = { id: id, type: type, names: names, blurb: blurb, palettes: palettes, family: parts.family }; for (var k in parts) if (parts.hasOwnProperty(k)) o[k] = parts[k]; if (type === 'Mythic') o.rare = true; return o; }
  SPECIES = SPECIES.concat([
    /* ---------------- cats ---------------- */
    sp('cinder', 'Fire', ['Cindermew', 'Scorchcat', 'Infernyx'], 'A tabby kitten with a warm spark on its head. It naps in sunbeams.',
      { family: 'cat', ears: 'cat', tail: 'cat', crest: 'flame', pattern: 'stripes', face: ['whiskers', 'forehead'], muzzle: false },
      [pal('#f29b4a', '#a85a1c', '#fff0dc', '#ffd23f', 'Ginger'), pal('#b9a38a', '#6e5a44', '#f6efe6', '#ff8a3d', 'Tabby'), pal('#e8c9a0', '#9c7a50', '#fffaf2', '#ff6b4a', 'Cream'), pal('#f4f1ea', '#9a9486', '#ffffff', '#ff5a8a', 'Snow', 1)]),
    sp('lynx', 'Fire', ['Sparklynx', 'Flintlynx', 'Pyrolynx'], 'A spotted lynx kitten with tufted ears and a glowing gem.',
      { family: 'cat', ears: 'tuft', tail: 'wag', crest: 'gem', pattern: 'spots', face: ['whiskers'], muzzle: true, tipColor: '#2b2233' },
      [pal('#d9a066', '#8a5a2c', '#fbeedd', '#ff5a3d', 'Amber'), pal('#c2b39a', '#6f624c', '#f6f1e8', '#ffb13d', 'Dune'), pal('#a8a0b8', '#5c5470', '#f1eef6', '#ff7a5c', 'Ash'), pal('#f7d86a', '#a8871c', '#fffbe6', '#e0455a', 'Gold', 1)]),
    sp('sunpaw', 'Fire', ['Sunpaw', 'Pridecub', 'Solarion'], 'A lion cub whose mane grows in like a sunrise.',
      { family: 'cat', ears: 'round', tail: 'lion', mane: 'lion', face: ['whiskers'], muzzle: true, maneColor: '#c8642a' },
      [pal('#f2c46a', '#a57a26', '#fff4dc', '#ff8a3d', 'Savanna'), pal('#e8b07a', '#9a6634', '#fff0e2', '#ff5a3d', 'Dusk'), pal('#f6e3b0', '#a8925a', '#fffbee', '#ffb13d', 'Pale'), pal('#f6f3ee', '#a39c90', '#ffffff', '#f2c14e', 'White lion', 1)]),
    sp('tigrit', 'Fire', ['Tigrit', 'Stripeblaze', 'Tygrion'], 'A bold tiger cub. Its stripes glow when it gets excited.',
      { family: 'cat', ears: 'round', tail: 'cat', pattern: 'stripes', face: ['whiskers', 'forehead'], muzzle: true, crest: 'bolt' },
      [pal('#f28a2e', '#2b2233', '#fff3e4', '#ffd23f', 'Bengal'), pal('#e0703a', '#5a2410', '#ffe9dc', '#ffe27a', 'Ember'), pal('#f4f1ea', '#2b2233', '#ffffff', '#62d9f5', 'Snow tiger'), pal('#ffd23f', '#2b2233', '#fffbe6', '#ff5a3d', 'Golden', 1)]),
    sp('foldmew', 'Water', ['Puddlemew', 'Mistfold', 'Tidefold'], 'A round-faced cat with folded ears. It loves splashing in puddles.',
      { family: 'cat', ears: 'fold', tail: 'cat', crest: 'drop', face: ['whiskers'], muzzle: false },
      [pal('#9fb3c8', '#566a82', '#eef4fa', '#62c3f5', 'Mist'), pal('#c9b8a8', '#7a6858', '#f8f2ec', '#5ab8e8', 'Oat'), pal('#8fa0b8', '#4c5a74', '#e8eef8', '#9fe6ff', 'Slate'), pal('#f6c7d8', '#b86b8a', '#fff2f7', '#6fd4ff', 'Pearl', 1)]),
    sp('snowleo', 'Water', ['Flurrykit', 'Frostprowl', 'Glaciara'], 'A snow leopard cub with a big fluffy tail it uses as a scarf.',
      { family: 'cat', ears: 'round', tail: 'fluffy', crest: 'snowflake', pattern: 'spots', face: ['whiskers'], muzzle: true },
      [pal('#dfe6ec', '#6e7c8a', '#ffffff', '#6fc6f2', 'Frost'), pal('#e8e0d0', '#8a7c64', '#fffcf4', '#7fd8f2', 'Tundra'), pal('#c8d4e2', '#56647a', '#f4f8fc', '#a8e8ff', 'Glacier'), pal('#d8ccf2', '#6e5aa8', '#f7f2ff', '#8ff0ff', 'Aurora', 1)]),
    sp('bubbit', 'Water', ['Bubbit', 'Fizzcat', 'Effervess'], 'A tuxedo kitten that blows bubbles when it purrs.',
      { family: 'cat', ears: 'cat', tail: 'cat', crest: 'bubble', face: ['whiskers'], muzzle: true, tipColor: '#ffffff' },
      [pal('#3b4252', '#1e2430', '#f4f6f8', '#8fd8ff', 'Tuxedo'), pal('#6a7a9a', '#343e58', '#eef2f8', '#9fe6ff', 'Blue'), pal('#5a4a44', '#2e241f', '#f6efe8', '#8fe0f0', 'Cocoa'), pal('#f4f6f8', '#9aa4b2', '#ffffff', '#b58cff', 'Opal', 1)]),
    sp('rainmew', 'Water', ['Rainmew', 'Tidecat', 'Lunarine'], 'A sleek cat that follows the moon and the tides.',
      { family: 'cat', ears: 'cat', tail: 'cat', crest: 'moon', face: ['whiskers'], muzzle: false },
      [pal('#5a78b8', '#2e4478', '#e6eefc', '#ffe27a', 'Tide'), pal('#4aa8a8', '#226a6a', '#e0f6f4', '#fff2a8', 'Lagoon'), pal('#7a6ab8', '#40347a', '#efebfa', '#ffe27a', 'Twilight'), pal('#2b2233', '#120d18', '#b9a8e8', '#f2f2f2', 'Eclipse', 1)]),
    sp('mossmew', 'Leaf', ['Mossmew', 'Fernprowl', 'Sylvancat'], 'A forest kitten with a leaf that grows on its head.',
      { family: 'cat', ears: 'cat', tail: 'cat', crest: 'leaf', pattern: 'stripes', face: ['whiskers'], muzzle: false },
      [pal('#9cc47a', '#557a38', '#f2fae8', '#ff9cc5', 'Moss'), pal('#b8a878', '#6e603a', '#f8f4e6', '#9ce07a', 'Bark'), pal('#8ab8a0', '#4a7860', '#eef8f2', '#ffd27a', 'Fern'), pal('#e8c8f0', '#9a6aa8', '#fbf2fd', '#7dd87a', 'Orchid', 1)]),
    sp('petalpaw', 'Leaf', ['Petalpaw', 'Bloomcat', 'Floravelle'], 'A sweet kitten with a flower behind its ear. It smells like a garden.',
      { family: 'cat', ears: 'cat', tail: 'fluffy', crest: 'flower', face: ['whiskers'], muzzle: true },
      [pal('#f2c8d8', '#b86b8a', '#fff4f8', '#ff7aa8', 'Blossom'), pal('#f6e0a8', '#a8904a', '#fffbee', '#ff9cc5', 'Honey'), pal('#d8c8f0', '#7a64a8', '#f7f2ff', '#ffd23f', 'Lilac'), pal('#ffffff', '#a8a8b8', '#ffffff', '#ff5a8a', 'Lily', 1)]),
    sp('cheetling', 'Leaf', ['Cheetling', 'Dashgrass', 'Savannix'], 'The fastest kitten in town. It races through tall grass.',
      { family: 'cat', ears: 'round', tail: 'cat', pattern: 'spots', face: ['whiskers', 'tears'], muzzle: true, tipColor: '#2b2233' },
      [pal('#f2c96a', '#8a6a24', '#fff8e4', '#8bd46b', 'Savanna'), pal('#e8b87a', '#8a5a2c', '#fff2e2', '#6fbf4f', 'Sunset'), pal('#dcd2b8', '#6e6450', '#fbf8ef', '#9ce07a', 'Dust'), pal('#f4f1ea', '#2b2233', '#ffffff', '#4fd8a8', 'King', 1)]),
    sp('shadekit', 'Leaf', ['Shadekit', 'Thornshade', 'Nocturnel'], 'A quiet black cat that hides in the leaves at night.',
      { family: 'cat', ears: 'cat', tail: 'cat', crest: 'gem', face: ['whiskers'], muzzle: false, innerEar: '#6a5a7a' },
      [pal('#3b3446', '#1a1622', '#8a7fa0', '#7dd87a', 'Midnight'), pal('#4a4a52', '#22222a', '#9a9aa8', '#c5e86a', 'Charcoal'), pal('#5a4064', '#2a1a30', '#a890b0', '#8ff0a8', 'Plum'), pal('#1e2430', '#0a0d12', '#6a7a9a', '#ffd23f', 'Void', 1)]),
    /* ---------------- dogs ---------------- */
    sp('toastie', 'Fire', ['Toastie', 'Embercorg', 'Hearthhound'], 'A short-legged pup that stays toasty warm. Great at cuddles.',
      { family: 'dog', ears: 'perk', tail: 'wag', crest: 'flame', muzzle: 'snout', snoutColor: '#fffaf2' },
      [pal('#f2a44a', '#a8621c', '#fff4e4', '#ffd23f', 'Toast'), pal('#d8864a', '#8a4a1c', '#ffefe0', '#ffe27a', 'Maple'), pal('#5a4a44', '#2a201c', '#f6efe8', '#ff8a3d', 'Tri-color'), pal('#f6f3ee', '#a39c90', '#ffffff', '#ff5a3d', 'Marshmallow', 1)]),
    sp('dotty', 'Fire', ['Dotty', 'Sirenspot', 'Firechief'], 'A spotted firehouse pup. It always runs toward the action.',
      { family: 'dog', ears: 'floppy', tail: 'wag', crest: 'bolt', pattern: 'spots', muzzle: 'snout', earColor: '#2b2233', spotColor: '#2b2233' },
      [pal('#f6f3ee', '#8a8478', '#ffffff', '#e8453c', 'Classic'), pal('#f2e8dc', '#8a7a64', '#fffcf6', '#ff8a3d', 'Cream'), pal('#e8eef4', '#6a7a8a', '#ffffff', '#ffd23f', 'Silver'), pal('#f6f3ee', '#8a8478', '#ffffff', '#62d9f5', 'Blue spot', 1)]),
    sp('shibble', 'Fire', ['Shibble', 'Kindleshiba', 'Shibaflare'], 'A confident pup with a curly tail. It glows like a campfire.',
      { family: 'dog', ears: 'perk', tail: 'curl', crest: 'gem', muzzle: 'snout', snoutColor: '#fff6ea' },
      [pal('#e8903a', '#9a5214', '#fff2e2', '#ff5a3d', 'Red'), pal('#e0c090', '#8a6a3a', '#fffaf0', '#ff8a3d', 'Sesame'), pal('#3b3446', '#1a1622', '#f4ece0', '#ffb13d', 'Black & tan'), pal('#f6f3ee', '#a39c90', '#ffffff', '#ff7aa8', 'Cream', 1)]),
    sp('weenie', 'Fire', ['Weenie', 'Sizzlehound', 'Scorchdachs'], 'A long little pup. It is exactly as long as a hot dog bun.',
      { family: 'dog', ears: 'floppy', tail: 'wag', crest: 'none', muzzle: 'snout', long: true },
      [pal('#b8642a', '#6e3410', '#f8e2cc', '#ffd23f', 'Chestnut'), pal('#3b2a24', '#1a120e', '#c89a6a', '#ff8a3d', 'Black & tan'), pal('#d8a878', '#8a5a2c', '#fff2e2', '#ff5a3d', 'Cream'), pal('#a8a0b8', '#5c5470', '#f1eef6', '#ffd23f', 'Dapple', 1)]),
    sp('snowpup', 'Water', ['Snowpup', 'Sleetsky', 'Blizzhusk'], 'A husky pup that loves the snow and howls at the rain.',
      { family: 'dog', ears: 'perk', tail: 'curl', crest: 'snowflake', face: ['mask'], muzzle: 'snout', snoutColor: '#ffffff' },
      [pal('#8a94a8', '#3e465a', '#f4f6fa', '#8fd8ff', 'Grey'), pal('#6a5a54', '#2e2420', '#f6f0ea', '#8fe6ff', 'Sable'), pal('#3b4252', '#1e2430', '#f4f6f8', '#9fe6ff', 'Black'), pal('#e8e4f0', '#8a84a0', '#ffffff', '#7fd8ff', 'Arctic', 1)]),
    sp('poofle', 'Water', ['Poofle', 'Bubbloo', 'Cascadoodle'], 'A curly pup with a pom-pom. It is basically a cloud with legs.',
      { family: 'dog', ears: 'poof', tail: 'puff', crest: 'pom', muzzle: 'snout' },
      [pal('#f6f3ee', '#a39c90', '#ffffff', '#6fc6f2', 'Cloud'), pal('#c8d8f0', '#5a6e98', '#f4f8ff', '#8fd8ff', 'Sky'), pal('#e8c8b8', '#9a6e5a', '#fff4ee', '#7fd8f2', 'Apricot'), pal('#d8c8f0', '#7a64a8', '#f7f2ff', '#8ff0ff', 'Lavender', 1)]),
    sp('splashpup', 'Water', ['Splashpup', 'Wavetriever', 'Oceanhound'], 'A friendly retriever pup. It will fetch anything from the water.',
      { family: 'dog', ears: 'floppy', tail: 'fluffy', crest: 'drop', muzzle: 'snout' },
      [pal('#f2c46a', '#a57a26', '#fff6e0', '#4fb4e8', 'Golden'), pal('#e8d0a0', '#9a7e4a', '#fffaee', '#62c3f5', 'Cream'), pal('#3b3446', '#1a1622', '#8a7fa0', '#6fd4ff', 'Black'), pal('#c89a6a', '#7a5028', '#f8ead8', '#8ff0ff', 'Copper', 1)]),
    sp('puglet', 'Water', ['Puglet', 'Drizzlepug', 'Monsoonpug'], 'A wrinkly little pug that snores like distant thunder.',
      { family: 'dog', ears: 'fold', tail: 'curl', crest: 'bubble', muzzle: 'snout', snoutColor: '#3b3446' },
      [pal('#e8d0a8', '#8a6e44', '#fff8ec', '#6fc6f2', 'Fawn'), pal('#d8c0a0', '#7a6040', '#fbf4ea', '#8fd8ff', 'Apricot'), pal('#3b3446', '#1a1622', '#8a7fa0', '#8fe6ff', 'Black'), pal('#c8d4e2', '#56647a', '#f4f8fc', '#ffffff', 'Silver', 1)]),
    sp('sniffle', 'Leaf', ['Sniffle', 'Scentleaf', 'Grovebeagle'], 'A beagle pup with a great nose. It can smell a snack from across town.',
      { family: 'dog', ears: 'floppy', tail: 'wag', crest: 'leaf', face: ['patch'], muzzle: 'snout', snoutColor: '#ffffff', tipColor: '#ffffff' },
      [pal('#c88a4a', '#6e4418', '#fff4e6', '#ff9cc5', 'Tricolor'), pal('#d8b07a', '#8a6034', '#fffaf0', '#8bd46b', 'Lemon'), pal('#a86a44', '#5a3014', '#f6e6d8', '#ffd27a', 'Red'), pal('#f6f3ee', '#8a8478', '#ffffff', '#7dd87a', 'Snowy', 1)]),
    sp('scruff', 'Leaf', ['Scruff', 'Brambler', 'Thicketeer'], 'A scrappy terrier with a tuft of hair. It digs up the best sticks.',
      { family: 'dog', ears: 'perk', tail: 'wag', crest: 'tuft', muzzle: 'snout' },
      [pal('#c8b08a', '#7a6440', '#f8f2e6', '#8bd46b', 'Wheat'), pal('#8a8478', '#4a453c', '#f0ede8', '#9ce07a', 'Grizzle'), pal('#f4f1ea', '#9a9486', '#ffffff', '#6fbf4f', 'Westie'), pal('#c86a44', '#6e2e14', '#f8e2d8', '#ffd23f', 'Ruby', 1)]),
    sp('pompom', 'Leaf', ['Pompom', 'Blossomane', 'Floralpom'], 'A fluffy little pup with a flower. It bounces instead of walking.',
      { family: 'dog', ears: 'perk', tail: 'fluffy', crest: 'flower', muzzle: 'snout' },
      [pal('#f2a45a', '#a8621c', '#fff4e4', '#ff7aa8', 'Orange'), pal('#f6e8c8', '#a8946a', '#fffcf4', '#ff9cc5', 'Cream'), pal('#e8c8d8', '#9a6a84', '#fff4f8', '#8bd46b', 'Rose'), pal('#b8a8d8', '#5e4e8a', '#f4f0fc', '#ffd23f', 'Violet', 1)]),
    sp('mopsy', 'Leaf', ['Mopsy', 'Mossmop', 'Shagglebrook'], 'A shaggy pup whose bangs cover its eyes. Nobody knows how it sees.',
      { family: 'dog', ears: 'floppy', tail: 'puff', crest: 'bangs', muzzle: 'snout', earColor: '#8a8478' },
      [pal('#dcd8d0', '#7a766c', '#f8f6f2', '#8bd46b', 'Sheepdog'), pal('#c8b89a', '#7a6a4a', '#f6f0e4', '#ff9cc5', 'Straw'), pal('#a8b8a0', '#5a6e52', '#eef4ea', '#ffd27a', 'Moss'), pal('#e8d8f0', '#8a74a0', '#faf4ff', '#7dd87a', 'Heather', 1)]),
    /* ---------------- bugs ---------------- */
    sp('glowbit', 'Fire', ['Glowbit', 'Lanternfly', 'Luminarch'], 'A firefly whose tail lights up the dark. Handy on camping trips.',
      { family: 'bug', ears: 'antennae', tail: 'glow', wings: 'bug', legs6: true, muzzle: false },
      [pal('#5a5a7a', '#2e2e44', '#d8d8ea', '#ffe45a', 'Night'), pal('#6a4a3a', '#3a2418', '#e8d8cc', '#ffcf3f', 'Ember'), pal('#3a5a4a', '#1e3428', '#cce4d8', '#c8ff5a', 'Swamp'), pal('#2b2233', '#120d18', '#b9a8e8', '#8ff0ff', 'Ghostlight', 1)]),
    sp('dotbug', 'Fire', ['Dotbug', 'Luckybeetle', 'Crimsonshell'], 'A ladybug that brings good luck. It gets a new spot every time it grows.',
      { family: 'bug', ears: 'antennae', pattern: 'ladybug', legs6: true, muzzle: false, belly: '#2b2233' },
      [pal('#e8453c', '#8a1a14', '#ffe0dc', '#2b2233', 'Classic'), pal('#f29b38', '#9a5214', '#ffeedd', '#2b2233', 'Orange'), pal('#f2d43a', '#9a8414', '#fffadc', '#2b2233', 'Sunny'), pal('#5ab8e8', '#22659a', '#e0f2ff', '#ffffff', 'Sky', 1)]),
    sp('hornbit', 'Fire', ['Hornbit', 'Ramshell', 'Titanox'], 'A strong little beetle with a big horn. It can lift a whole acorn.',
      { family: 'bug', ears: 'none', crest: 'rhino', pattern: 'beetle', legs6: true, muzzle: false },
      [pal('#8a3a2a', '#4a1a10', '#f0d0c8', '#ff8a3d', 'Mahogany'), pal('#3a3a5a', '#1a1a2e', '#d0d0e8', '#ff5a3d', 'Obsidian'), pal('#6a4a2a', '#3a2410', '#e8d8c0', '#ffd23f', 'Bronze'), pal('#2e8a6a', '#145a44', '#d0f0e4', '#ffd23f', 'Jewel', 1)]),
    sp('antsy', 'Fire', ['Antsy', 'Emberant', 'Blazeant'], 'A hard-working fire ant. It carries ten times its weight in snacks.',
      { family: 'bug', ears: 'antennae', tail: 'abdomen', crest: 'flame', legs6: true, muzzle: false },
      [pal('#d8453c', '#7a1a14', '#ffe0dc', '#ffd23f', 'Fire'), pal('#8a3a2a', '#4a1a10', '#f0d0c8', '#ff8a3d', 'Rust'), pal('#3b3446', '#1a1622', '#b8b0c8', '#ff5a3d', 'Carpenter'), pal('#f2c14e', '#a67c12', '#fff6d8', '#ff5a3d', 'Honeypot', 1)]),
    sp('skimmer', 'Water', ['Skimmer', 'Dartwing', 'Odonara'], 'A dragonfly that skims across ponds faster than you can blink.',
      { family: 'bug', ears: 'antennae', tail: 'rod', wings: 'bug', legs6: true, muzzle: false },
      [pal('#3fa8c8', '#1d6a84', '#dcf4fc', '#8fe6ff', 'Pond'), pal('#4ac88a', '#1e7a50', '#dcfaec', '#8ff0ff', 'Emerald'), pal('#6a6ad8', '#3434a0', '#e8e8fc', '#9fe6ff', 'Indigo'), pal('#e84a8a', '#9a1a50', '#ffe0ee', '#8ff0ff', 'Ruby', 1)]),
    sp('shellby', 'Water', ['Shellby', 'Spiralis', 'Nautilord'], 'A snail that carries its house everywhere. It never gets lost.',
      { family: 'bug', ears: 'stalks', pattern: 'snail', muzzle: false },
      [pal('#a8c8b8', '#5a7a6a', '#eef8f2', '#e8b87a', 'Garden'), pal('#b8b0d0', '#6a6488', '#f4f2fa', '#f2a0c0', 'Lilac'), pal('#c8b8a0', '#7a6a50', '#f8f4ee', '#6fc6f2', 'Sand'), pal('#8fd8f2', '#3a8aa8', '#e8f8ff', '#ffd23f', 'Tidepool', 1)]),
    sp('rolly', 'Water', ['Rolly', 'Pebblebug', 'Bouldershell'], 'A pill bug that rolls into a ball when it is shy.',
      { family: 'bug', ears: 'antennae', pattern: 'segments', legs6: true, muzzle: false },
      [pal('#8a94a8', '#4a5468', '#e8eef4', '#6fc6f2', 'Pebble'), pal('#7a8a7a', '#445244', '#e8f0e8', '#8fd8ff', 'Moss'), pal('#9a8a7a', '#5a4a3a', '#f0e8e0', '#6fd4ff', 'Clay'), pal('#6a8ad8', '#2e4aa0', '#e8eefc', '#ffe27a', 'Sapphire', 1)]),
    sp('mothlet', 'Water', ['Mothlet', 'Moonmoth', 'Lunaria'], 'A fuzzy moth that dances around the moonlight.',
      { family: 'bug', ears: 'feathery', wings: 'butterfly', crest: 'moon', muzzle: false },
      [pal('#c8d8e8', '#6a7a8a', '#f4f8fc', '#8fd8c8', 'Luna'), pal('#e8e0c8', '#8a7a5a', '#fffcf0', '#b8e8a0', 'Ivory'), pal('#b8a8d8', '#5e4e8a', '#f4f0fc', '#8fe6ff', 'Dusk'), pal('#f4f6f8', '#9aa4b2', '#ffffff', '#ffb8d8', 'Ghost', 1)]),
    sp('buzzby', 'Leaf', ['Buzzby', 'Honeyhum', 'Queenbloom'], 'A fuzzy bumblebee that helps the flowers grow.',
      { family: 'bug', ears: 'antennae', tail: 'stinger', wings: 'bug', pattern: 'bee', muzzle: false, belly: '#fff6c9' },
      [pal('#f2c42e', '#8a6a0a', '#fff6c9', '#ff9cc5', 'Honey'), pal('#f29b38', '#8a4a0a', '#ffeedd', '#8bd46b', 'Amber'), pal('#e8d8a8', '#8a7a4a', '#fffbee', '#b58cff', 'Pollen'), pal('#8ad8f2', '#2e7a9a', '#e8f8ff', '#ffd23f', 'Blue bee', 1)]),
    sp('fluttle', 'Leaf', ['Fluttle', 'Petalwing', 'Monarcha'], 'A caterpillar-soft baby that grows the prettiest wings in town.',
      { family: 'bug', ears: 'antennae', wings: 'butterfly', crest: 'flower', muzzle: false },
      [pal('#8a6ac8', '#4a3484', '#f0ebfa', '#f29b38', 'Monarch'), pal('#6ac8a8', '#2e7a64', '#e8faf4', '#ff9cc5', 'Mint'), pal('#e87aa8', '#9a2e5e', '#ffeef6', '#ffd23f', 'Rose'), pal('#4a8ae8', '#1e4aa0', '#e8f0ff', '#8ff0ff', 'Morpho', 1)]),
    sp('hopsy', 'Leaf', ['Hopsy', 'Chirper', 'Meadowleap'], 'A grasshopper that chirps songs in the tall grass.',
      { family: 'bug', ears: 'antennae', wings: 'bug', legs6: true, crest: 'leaf', muzzle: false },
      [pal('#8ac85a', '#4a7a24', '#eefae4', '#f2d43a', 'Meadow'), pal('#c8b85a', '#7a6a1e', '#faf6e4', '#8bd46b', 'Straw'), pal('#6ab87a', '#2e6e3e', '#e8f8ec', '#ff9cc5', 'Clover'), pal('#e8a0c8', '#9a4a7a', '#fff0f8', '#8bd46b', 'Pink katydid', 1)]),
    sp('sprigbug', 'Leaf', ['Sprigbug', 'Leaflet', 'Canopix'], 'A leaf bug that looks exactly like a leaf. Great at hide and seek.',
      { family: 'bug', ears: 'antennae', wings: 'butterfly', legs6: true, muzzle: false },
      [pal('#6ab84a', '#2e6e1e', '#e8f8e0', '#9ce07a', 'Spring'), pal('#c89a4a', '#7a5214', '#faeedc', '#e8b83a', 'Autumn'), pal('#4a9a6a', '#1e5a3a', '#e0f4e8', '#b8e87a', 'Jungle'), pal('#e85a3a', '#8a2410', '#ffe6dc', '#ffd23f', 'Maple', 1)]),
    /* ---------------- critters and birds ---------------- */
    sp('tadlet', 'Leaf', ['Tadlet', 'Hopscotch', 'Lilyking'], 'A tree frog with a big grin. It sings loudest right after it rains.',
      { family: 'critter', ears: 'bumps', crest: 'leaf', pattern: 'spots', muzzle: 'wide', smooth: true, spotColor: '#3f7a2f' },
      [pal('#7cc85a', '#3a7a24', '#f2fce4', '#e8453c', 'Tree frog'), pal('#4a8ae8', '#1e3a8a', '#dce8ff', '#2b2233', 'Dart frog'), pal('#c8a86a', '#7a5a24', '#faf2e0', '#8bd46b', 'Toad'), pal('#f2c14e', '#a67c12', '#fff6d8', '#e8453c', 'Golden', 1)]),
    sp('flitter', 'Fire', ['Flitter', 'Duskwing', 'Nightblaze'], 'A little bat that comes out at sunset. Its ears hear everything.',
      { family: 'critter', ears: 'batears', wings: 'bat', muzzle: true, fangs: true, innerEar: '#f4a8b8' },
      [pal('#7a5a4a', '#3e2a20', '#e8d0c0', '#ff8a3d', 'Brown'), pal('#4a3e5a', '#221a2e', '#b8a8c8', '#ff5a8a', 'Night'), pal('#d8864a', '#8a4a1c', '#fff0e0', '#ffd23f', 'Fruit bat'), pal('#f4f1ea', '#9a9486', '#ffffff', '#e8453c', 'Ghost', 1)]),
    sp('axolittle', 'Water', ['Axolittle', 'Gillwiggle', 'Axolord'], 'An axolotl that always looks like it is smiling. Because it is.',
      { family: 'critter', ears: 'gills', tail: 'paddle', muzzle: 'wide', smooth: true },
      [pal('#f6c8d4', '#b86b84', '#fff2f6', '#e8577a', 'Pink'), pal('#8a8a6a', '#4a4a30', '#e8e8d8', '#c8a86a', 'Wild'), pal('#f2d88a', '#a8903a', '#fffbe6', '#ff8a5a', 'Golden'), pal('#6a8ad8', '#2e4aa0', '#e0e8ff', '#8fe6ff', 'Blue', 1)]),
    sp('chirpet', 'Fire', ['Chirpet', 'Redcrest', 'Cardinalis'], 'A bright red songbird. It wakes up the whole town every morning.',
      { family: 'bird', ears: 'none', crest: 'cardinal', face: ['beakmask'], wings: 'folded', tail: 'birdtail', muzzle: 'beak', beakColor: '#f29b38', wingColor: '#a8261c' },
      [pal('#e8453c', '#8a1a14', '#ff9a8a', '#ffd23f', 'Cardinal'), pal('#f29b38', '#9a5214', '#ffd0a0', '#ffe27a', 'Vermilion'), pal('#c86a8a', '#7a2e4a', '#f4c0d0', '#ffd23f', 'Rosy'), pal('#f2d43a', '#a8871c', '#fff4b0', '#e8453c', 'Golden', 1)]),
    sp('waddles', 'Water', ['Waddles', 'Slidebill', 'Emperion'], 'A penguin that slides on its belly everywhere it can.',
      { family: 'bird', ears: 'none', crest: 'plumes', wings: 'flipper', muzzle: 'beak', beakColor: '#f29b38', footColor: '#f29b38', belly: '#ffffff' },
      [pal('#2e3448', '#14182a', '#ffffff', '#ffd23f', 'Classic'), pal('#4a78b8', '#22467a', '#ffffff', '#ffe27a', 'Little blue'), pal('#8a8478', '#4a453c', '#f4f1ea', '#ffb13d', 'Fluffy'), pal('#b8a8e8', '#5e4e9a', '#ffffff', '#8fe6ff', 'Aurora', 1)]),
    sp('hootlet', 'Leaf', ['Hootlet', 'Barnhoot', 'Owlanthus'], 'A wise little owl with enormous eyes. It knows every tree in the forest.',
      { family: 'bird', ears: 'owltuft', face: ['owldisc'], eyeScale: 1.2, wings: 'folded', pattern: 'chevrons', muzzle: 'beak', beakColor: '#e8b83a' },
      [pal('#a8784a', '#5a3a1c', '#f4e4cc', '#f2c14e', 'Tawny'), pal('#f4f1ea', '#9a9486', '#ffffff', '#f2c14e', 'Snowy'), pal('#8a8a94', '#4a4a54', '#ecece8', '#ff8a3d', 'Grey'), pal('#e8b86a', '#8a5a1c', '#fff4dc', '#8bd46b', 'Golden', 1)]),
    sp('blubbo', 'Water', ['Blubbo', 'Wobblo', 'Megawobble'], 'A squishy round blob that bounces instead of walking. Nobody knows what it is, including Blubbo.',
      { family: 'critter', blob: true, ears: 'none', crest: 'bobble', muzzle: 'goofy', smooth: true, eyeScale: 1.15 },
      [pal('#9ee0c8', '#3a8a70', '#effcf6', '#ff8a5a', 'Mint'), pal('#c8b8f0', '#6a54a8', '#f6f2ff', '#ffd23f', 'Lavender'), pal('#f6e07a', '#a8901c', '#fffbe0', '#5ab8e8', 'Lemon'), pal('#3d4296', '#1a1e5a', '#c8ccff', '#ff8fd0', 'Galaxy', 1)]),
    sp('gloop', 'Water', ['Gloopcube', 'Globbo', 'Goopocalypse'], 'A wobbly cube of goo with a coin stuck inside. It grows into a blob, then a giant (friendly) slime monster.',
      { family: 'critter', goo: true, muzzle: 'wide', smooth: true },
      [pal('#8fe36a', '#3f8a24', '#e8fcdc', '#ff8a3d', 'Lime'), pal('#5ac8f2', '#1e6a9a', '#e0f6ff', '#ffd23f', 'Blue raspberry'), pal('#b58cff', '#5e3aa8', '#f2ebff', '#8fe36a', 'Grape'), pal('#ff8fd0', '#a83a7a', '#fff0f8', '#8fe6ff', 'Glitter', 1)]),
    /* ---------------- objects that come alive ---------------- */
    sp('pebble', 'Leaf', ['Pebble', 'Rock', 'Boulder'], 'A smooth little stone with a sprout on top. It grows into a rock, then a mossy boulder that sparkles with crystals.',
      { family: 'object', shape: 'rock', muzzle: 'wide', smooth: true },
      [pal('#a8a4a0', '#5e5a56', '#e8e6e2', '#6fd49a', 'Granite'), pal('#d8b88a', '#8a6a3e', '#f8ecd8', '#ff8a5a', 'Sandstone'), pal('#7a8494', '#3e4656', '#dce2ea', '#8fd8ff', 'Slate'), pal('#6a5a8a', '#2e2448', '#e0d8f0', '#e08aff', 'Geode', 1)]),
    sp('icecube', 'Water', ['Ice Cube', 'Snowcone', 'Iceberg'], 'A frosty little ice cube that grows into a snowcone, then a giant iceberg. It never melts, promise.',
      { family: 'object', shape: 'ice', muzzle: 'wide', smooth: true },
      [pal('#bfe8ff', '#4a8ab8', '#f4fcff', '#e8453c', 'Cherry'), pal('#a8d8ff', '#3a78b8', '#eef8ff', '#3a8ed8', 'Blue raspberry'), pal('#c8f0e8', '#3a9a88', '#f4fffc', '#6fd84a', 'Lime'), pal('#e8e0ff', '#7a6ab8', '#ffffff', '#ff8fd0', 'Rainbow', 1)]),
    sp('match', 'Fire', ['Match', 'Torch', 'Bonfire'], 'A brave little match. It grows into a torch, then a roaring bonfire that is great for marshmallows.',
      { family: 'object', shape: 'fire', muzzle: 'wide', smooth: true },
      [pal('#ff8a2a', '#b8420e', '#fff4d8', '#ffd23f', 'Campfire'), pal('#4a9ae8', '#1e4a9a', '#e8f4ff', '#b8ecff', 'Blue flame'), pal('#5ad86a', '#1e7a2e', '#eaffe8', '#e8ff8a', 'Witchfire'), pal('#b58cff', '#5e3aa8', '#f4ecff', '#ffb8f0', 'Spirit flame', 1)]),
    /* ---------------- family requests ---------------- */
    sp('chai', 'Leaf', ['Chaimander', 'Chaidrake', 'Chaidragon'], 'A little leaf lizard that smells like spiced tea. It sprouts tiny leaf wings, then grows into a mighty leaf dragon.',
      { family: 'critter', low: true, long: true, headScale: [1.16, 1.14, 0.84], ears: 'none', crest: ['leafridge', 'leafridge', 'hornleaf'], tail: 'lizard', wings: 'leafwing', wingsFrom: 1, wingSize: [0, 0.65, 1.3], pattern: 'spots', muzzle: 'wide' },
      [pal('#8cc65a', '#3f7a26', '#eef8dc', '#2f8f3a', 'Matcha'), pal('#c9a27a', '#7a5232', '#f8eee0', '#7cc65a', 'Chai latte'), pal('#e0884a', '#93461c', '#fff0dc', '#f2c14e', 'Autumn'), pal('#2fa38a', '#145a4c', '#d8f6ee', '#f2d46a', 'Jade', 1)]),
    sp('cupcat', 'Fire', ['Cupcat', 'Cakecat', 'Partycake'], 'A cupcake kitten with a cherry on top. It grows into a layer cake, then a party cake with candles. Everything wants to come close to it.',
      { family: 'object', shape: 'cake', ears: 'cat', tail: 'curl', face: ['whiskers'], muzzle: false, smooth: true },
      [pal('#ff9cc0', '#c4507c', '#fff3e2', '#7ad0ff', 'Strawberry'), pal('#8a5634', '#4a2a16', '#f8e8d0', '#ffd23f', 'Chocolate'), pal('#fff3d6', '#c8a872', '#fffaf0', '#ff8fb8', 'Vanilla'), pal('#a8f0d0', '#3a9a78', '#fff8ee', '#8a5a3a', 'Mint chip'), pal('#f4e4ff', '#9a7ac8', '#ffffff', '#ffd23f', 'Rainbow sprinkle', 1)]),
    /* ---------------- rare mythological creatures (found as rare eggs) ---------------- */
    sp('drake', 'Mythic', ['Drakelet', 'Scalewing', 'Dracoryn'], 'A baby dragon. It sneezes little sparks and guards its treasure (mostly socks).',
      { family: 'myth', ears: 'fin', crest: 'horns', wings: 'bat', tail: 'dragon', pattern: 'scales', muzzle: true, fangs: true },
      [pal('#4ab86a', '#1e6e3a', '#e8f8d8', '#f2c14e', 'Forest'), pal('#d8453c', '#7a1a14', '#ffe8c8', '#ffd23f', 'Crimson'), pal('#4a7ad8', '#1e3a8a', '#e0ecff', '#8fe6ff', 'Sapphire'), pal('#2b2233', '#120d18', '#b9a8e8', '#ff5a8a', 'Shadow', 1)]),
    sp('unicorn', 'Mythic', ['Glimmerfoal', 'Prismane', 'Everhorn'], 'A unicorn foal with a shining horn. Rainbows follow it around.',
      { family: 'myth', ears: 'cat', crest: 'horn', mane: 'unicorn', tail: 'unicorn', muzzle: true, maneColor: '#ff9cc5', mane2: '#8fd8ff' },
      [pal('#fbf8ff', '#a898c8', '#ffffff', '#ff9cc5', 'Pearl'), pal('#f8e8f4', '#b884a8', '#ffffff', '#b58cff', 'Blush'), pal('#e8f0ff', '#8a9ac8', '#ffffff', '#8fd8ff', 'Sky'), pal('#2b2233', '#120d18', '#b9a8e8', '#ffd23f', 'Nightmare', 1)]),
    sp('sphinx', 'Mythic', ['Riddlekit', 'Sandscribe', 'Pharaoth'], 'A wise desert cat with a golden headdress. It loves riddles.',
      { family: 'myth', ears: 'cat', crest: 'nemes', wings: 'feather', wingsFrom: 1, tail: 'lion', face: ['kohl'], muzzle: false, stripe: '#2956c9', wingColor: '#f6e8c8' },
      [pal('#e8c88a', '#9a7a3a', '#fff8e4', '#f2c14e', 'Sand'), pal('#d8a878', '#8a5a2c', '#fff0e2', '#f2c14e', 'Sunset'), pal('#c8b8a8', '#7a6858', '#f8f2ec', '#e8d88a', 'Stone'), pal('#3b3446', '#1a1622', '#b8b0c8', '#f2c14e', 'Obsidian', 1)]),
    sp('cerberus', 'Mythic', ['Tripup', 'Trihound', 'Cerberon'], 'Three puppies in one! Each head has its own opinion about snacks.',
      { family: 'myth', heads: 3, ears: 'perk', tail: 'dragon', muzzle: 'snout', collar: true, snoutColor: '#5a5064' },
      [pal('#3b3446', '#1a1622', '#8a7fa0', '#ff5a3d', 'Shadow'), pal('#6a5a54', '#2e2420', '#b8a89a', '#ffb13d', 'Ember'), pal('#8a94a8', '#3e465a', '#d8dee8', '#8fe6ff', 'Ghost'), pal('#f4f1ea', '#9a9486', '#ffffff', '#ffd23f', 'Heavenly', 1)]),
    sp('chimera', 'Mythic', ['Mishmash', 'Chimerrow', 'Chimeraxis'], 'Part lion, part goat, part snake. All of it wants to play.',
      { family: 'myth', ears: 'round', mane: 'lion', crest: 'goat', tail: 'snake', wings: 'bat', wingsFrom: 2, face: ['whiskers'], muzzle: true, maneColor: '#a8541c' },
      [pal('#e8b86a', '#9a6a24', '#fff4dc', '#b8642a', 'Classic'), pal('#c8a07a', '#7a5a34', '#f8ecdc', '#8a3a2a', 'Desert'), pal('#8a8aa8', '#4a4a6a', '#e8e8f4', '#5a4a8a', 'Storm'), pal('#f4f1ea', '#9a9486', '#ffffff', '#f2c14e', 'Ivory', 1)]),
    sp('griffin', 'Mythic', ['Grifflet', 'Skytalon', 'Aerogriff'], 'Eagle in front, lion in back. It rules the sky over town.',
      { family: 'myth', ears: 'tuft', crest: 'feathers', wings: 'feather', tail: 'lion', muzzle: 'beak', maneColor: '#8a5a2c' },
      [pal('#c89a6a', '#7a5028', '#fff4e4', '#f6f3ee', 'Golden eagle'), pal('#8a7a6a', '#4a3e30', '#f4f1ea', '#e8d8b8', 'Hawk'), pal('#e8e4dc', '#8a8478', '#ffffff', '#c8b89a', 'Snowy'), pal('#4a6ad8', '#1e3a8a', '#e0ecff', '#f2c14e', 'Royal', 1)]),
    sp('kitsune', 'Mythic', ['Kitsu', 'Spiritail', 'Nineveil'], 'A spirit fox. It grows a new tail as it gets wiser, all the way to nine.',
      { family: 'myth', ears: 'pointy', tail: 'kitsune', crest: 'flame', muzzle: true },
      [pal('#f6f3ee', '#b8a898', '#ffffff', '#ff5a5a', 'Spirit'), pal('#f2a45a', '#a8621c', '#fff4e4', '#ffe27a', 'Autumn'), pal('#b8a8e8', '#5e4e9a', '#f4f0ff', '#8fe6ff', 'Dream'), pal('#2b2233', '#120d18', '#b9a8e8', '#b58cff', 'Void', 1)]),
    sp('phoenix', 'Mythic', ['Cindrel', 'Pyrewing', 'Phoenara'], 'A fire bird that glows like a sunrise. It is warm to hug.',
      { family: 'myth', ears: 'none', crest: 'flame', wings: 'fire', tail: 'phoenix', muzzle: 'beak' },
      [pal('#e8453c', '#8a1a14', '#ffe0c8', '#ffb13d', 'Blaze'), pal('#f29b38', '#9a5214', '#fff0d8', '#ffe27a', 'Dawn'), pal('#4a8ae8', '#1e4aa0', '#e0ecff', '#8fe6ff', 'Azure flame'), pal('#b58cff', '#5e3aa8', '#f4ecff', '#ff8fd0', 'Spirit flame', 1)])
  ]);

  var INK = '#2b2233';
  /* round, all-head creatures */
  var BLOB = [
    { hr: 52, hy: 126, by: 150, brx: 30, bry: 26, er: [9.5, 12], ed: 21, ey: -2, foot: 12, scale: 0.9 },
    { hr: 60, hy: 118, by: 150, brx: 34, bry: 26, er: [9.5, 12], ed: 23, ey: -4, foot: 13, scale: 1 },
    { hr: 66, hy: 112, by: 150, brx: 38, bry: 26, er: [9.5, 12], ed: 25, ey: -6, foot: 14, scale: 1.08 }
  ];
  var GEO = [
    { hr: 46, hy: 90, by: 147, brx: 31, bry: 26, er: [9.5, 11.5], ed: 19, ey: 4, foot: 11, scale: 0.9 },
    { hr: 41, hy: 76, by: 138, brx: 37, bry: 35, er: [8, 10], ed: 17, ey: 3, foot: 12, scale: 1 },
    { hr: 37, hy: 62, by: 130, brx: 40, bry: 45, er: [7, 8.5], ed: 16, ey: 2, foot: 13, scale: 1.08 }
  ];

  function f(n) { return Math.round(n * 10) / 10; }
  function P() { return Array.prototype.slice.call(arguments).map(function (v) { return typeof v === 'number' ? f(v) : v; }).join(' '); }
  function el(tag, attrs, inner) {
    var s = '<' + tag;
    for (var k in attrs) if (attrs.hasOwnProperty(k) && attrs[k] != null) s += ' ' + k + '="' + attrs[k] + '"';
    return s + (inner == null ? '/>' : '>' + inner + '</' + tag + '>');
  }
  function circle(cx, cy, r, fill, extra) { return el('circle', assign({ cx: f(cx), cy: f(cy), r: f(r), fill: fill }, extra)); }
  function ellipse(cx, cy, rx, ry, fill, extra) { return el('ellipse', assign({ cx: f(cx), cy: f(cy), rx: f(rx), ry: f(ry), fill: fill }, extra)); }
  function path(d, fill, extra) { return el('path', assign({ d: d, fill: fill }, extra)); }
  function assign(a, b) { if (b) for (var k in b) if (b.hasOwnProperty(k)) a[k] = b[k]; return a; }
  function outline(c) { return { stroke: c, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }; }

  /* ---------- parts ---------- */
  function ears(sp, st, g, c, hx) {
    var r = g.hr, hy = g.hy, s = '', o = outline(c.dark);
    if (sp.ears === 'pointy') {
      var tall = [1.35, 1.5, 1.7][st], spread = [0.2, 0.18, 0.12][st];
      [-1, 1].forEach(function (d) {
        var bx1 = hx + d * r * 0.92, by1 = hy - r * 0.2, tx = hx + d * r * (0.78 + spread), ty = hy - r * tall, bx2 = hx + d * r * 0.18, by2 = hy - r * 0.86;
        s += path(P('M', bx1, by1, 'Q', tx - d * 4, ty + 10, tx, ty, 'Q', bx2 + d * 10, by2 - 8, bx2, by2, 'Z'), c.main, o);
        s += path(P('M', bx1 - d * 7, by1 - 8, 'L', tx - d * 3, ty + 12, 'L', bx2 + d * 8, by2 + 2, 'Z'), st === 2 ? c.accent : c.light);
      });
    } else if (sp.ears === 'long') {
      var len = [0.62, 0.72, 0.85][st];
      [-1, 1].forEach(function (d) {
        var cx = hx + d * r * 0.42, cy = hy - r * (0.95 + len * 0.5), rot = d * [10, 16, 22][st];
        s += '<g transform="rotate(' + rot + ' ' + f(cx) + ' ' + f(hy - r * 0.6) + ')">' +
          ellipse(cx, cy, r * 0.24, r * len, c.main, o) + ellipse(cx, cy + 3, r * 0.12, r * len * 0.72, st === 2 ? c.accent : c.light) + '</g>';
      });
    } else if (sp.ears === 'round') {
      [-1, 1].forEach(function (d) {
        s += circle(hx + d * r * 0.78, hy - r * 0.62, r * 0.27, c.main, o) + circle(hx + d * r * 0.78, hy - r * 0.6, r * 0.14, c.light);
      });
    } else if (sp.ears === 'cat' || sp.ears === 'tuft') {
      var ct = [1.22, 1.32, 1.46][st];
      [-1, 1].forEach(function (d) {
        var b1x = hx + d * r * 0.95, b1y = hy - r * 0.3, tx = hx + d * r * 0.8, ty = hy - r * ct, b2x = hx + d * r * 0.26, b2y = hy - r * 0.93;
        s += path(P('M', b1x, b1y, 'L', tx, ty, 'L', b2x, b2y, 'Z'), c.main, o);
        s += path(P('M', b1x - d * 6, b1y - 7, 'L', tx - d * 2, ty + 10, 'L', b2x + d * 7, b2y + 3, 'Z'), sp.innerEar || c.light);
        s += path(P('M', (b1x + b2x) / 2, b1y - 4, 'q', d * 1, -8, d * 6, -14, 'M', (b1x + b2x) / 2 - d * 5, b1y - 5, 'q', 0, -6, d * 3, -10), 'none', { stroke: '#fff', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.8 });
        if (sp.ears === 'tuft') s += path(P('M', tx, ty + 2, 'l', d * 3, -12, 'M', tx - d * 3, ty + 3, 'l', -d * 2, -10), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
      });
    } else if (sp.ears === 'perk') {
      var pt = [1.2, 1.32, 1.45][st];
      [-1, 1].forEach(function (d) {
        var b1x = hx + d * r * 0.92, b1y = hy - r * 0.35, tx = hx + d * r * 0.72, ty = hy - r * pt, b2x = hx + d * r * 0.25, b2y = hy - r * 0.93;
        s += path(P('M', b1x, b1y, 'Q', tx + d * 10, ty - 2, tx, ty, 'Q', tx - d * 10, ty - 2, b2x, b2y, 'Z'), c.main, o);
        s += path(P('M', b1x - d * 7, b1y - 7, 'Q', tx + d * 3, ty + 8, tx, ty + 10, 'Q', tx - d * 5, ty + 10, b2x + d * 7, b2y + 3, 'Z'), c.light);
        s += path(P('M', (b1x + b2x) / 2, b1y - 4, 'q', d * 1, -8, d * 5, -13), 'none', { stroke: '#fff', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.8 });
      });
    } else if (sp.ears === 'fold') {
      [-1, 1].forEach(function (d) {
        s += path(P('M', hx + d * r * 0.9, hy - r * 0.5, 'Q', hx + d * r * 0.95, hy - r * 1.08, hx + d * r * 0.4, hy - r * 0.98, 'Q', hx + d * r * 0.72, hy - r * 0.78, hx + d * r * 0.9, hy - r * 0.5, 'Z'), c.main, o);
      });
    } else if (sp.ears === 'antennae' || sp.ears === 'feathery' || sp.ears === 'stalks') {
      var len = r * [0.55, 0.75, 0.95][st];
      [-1, 1].forEach(function (d) {
        var x0 = hx + d * r * 0.3, y0 = hy - r * 0.88, x1 = hx + d * r * (0.62 + 0.12 * st), y1 = y0 - len;
        var stalk = P('M', x0, y0, 'Q', hx + d * r * 0.25, y1 + 8, x1, y1);
        if (sp.ears === 'stalks') {
          s += path(stalk, 'none', { stroke: c.dark, 'stroke-width': 9, 'stroke-linecap': 'round' }) + path(stalk, 'none', { stroke: c.main, 'stroke-width': 5, 'stroke-linecap': 'round' });
          s += circle(x1, y1, 6 + st, c.accent, outline(c.dark));
        } else {
          s += path(stalk, 'none', { stroke: c.dark, 'stroke-width': 3.2, 'stroke-linecap': 'round' });
          if (sp.ears === 'feathery') for (var k = 1; k <= 4; k++) { var t = k / 5, fx = x0 + (x1 - x0) * t, fy = y0 + (y1 - y0) * t; s += path(P('M', fx, fy, 'l', d * 9, 3, 'M', fx, fy, 'l', -d * 6, -5), 'none', { stroke: c.dark, 'stroke-width': 2, 'stroke-linecap': 'round' }); }
          else s += circle(x1, y1, 4.5 + st, c.accent, outline(c.dark));
        }
      });
    } else if (sp.ears === 'owltuft') {
      [-1, 1].forEach(function (d) {
        var bx1 = hx + d * r * 0.55, by1 = hy - r * 0.85, tx = hx + d * r * (0.95 + st * 0.06), ty = hy - r * (1.25 + st * 0.08);
        s += path(P('M', bx1, by1, 'Q', hx + d * r * 0.7, ty + 6, tx, ty, 'Q', hx + d * r * 0.95, hy - r * 0.9, hx + d * r * 0.88, hy - r * 0.5, 'Z'), c.main, o);
        s += path(P('M', bx1 + d * 6, by1 - 4, 'L', tx - d * 6, ty + 8), 'none', { stroke: c.dark, 'stroke-width': 1.8, opacity: 0.6, 'stroke-linecap': 'round' });
      });
    } else if (sp.ears === 'gills') {
      [-1, 1].forEach(function (d) {
        for (var i = 0; i < 3; i++) {
          var x0 = hx + d * r * 0.82, y0 = hy - r * 0.35 + i * r * 0.28, ang = (-35 + i * 30) * Math.PI / 180, L = r * [0.5, 0.62, 0.75][st];
          var x1 = x0 + d * Math.cos(ang) * L, y1 = y0 + Math.sin(ang) * L;
          var gd = P('M', x0, y0, 'Q', (x0 + x1) / 2, y0 - 6, x1, y1);
          s += path(gd, 'none', { stroke: c.dark, 'stroke-width': 8, 'stroke-linecap': 'round' }) + path(gd, 'none', { stroke: c.accent, 'stroke-width': 5, 'stroke-linecap': 'round' });
          for (var q = 1; q <= 3; q++) { var t = q / 4, fx = x0 + (x1 - x0) * t, fy = y0 + (y1 - y0) * t - 3; s += path(P('M', fx, fy, 'l', d * 2, -6), 'none', { stroke: c.accent, 'stroke-width': 3, 'stroke-linecap': 'round' }); }
        }
      });
    } else if (sp.ears === 'batears') {
      var bt = [1.5, 1.66, 1.85][st];
      [-1, 1].forEach(function (d) {
        var b1x = hx + d * r * 1.0, b1y = hy - r * 0.15, tx = hx + d * r * 1.02, ty = hy - r * bt, b2x = hx + d * r * 0.3, b2y = hy - r * 0.9;
        s += path(P('M', b1x, b1y, 'Q', tx + d * 8, ty + 20, tx, ty, 'Q', b2x + d * 6, b2y - 20, b2x, b2y, 'Z'), c.main, o);
        s += path(P('M', b1x - d * 7, b1y - 8, 'Q', tx + d * 2, ty + 24, tx - d * 2, ty + 12, 'Q', b2x + d * 10, b2y - 10, b2x + d * 8, b2y + 3, 'Z'), sp.innerEar || c.light);
      });
    } else if (sp.ears === 'fin') {
      [-1, 1].forEach(function (d) {
        var ex = 0.35 + 0.12 * st;
        s += path(P('M', hx + d * r * 0.8, hy - r * 0.55, 'L', hx + d * r * (1.1 + ex), hy - r * 0.85, 'L', hx + d * r * (1.02 + ex * 0.6), hy - r * 0.45, 'L', hx + d * r * (1.12 + ex), hy - r * 0.2, 'L', hx + d * r * 0.88, hy - r * 0.05, 'Z'), c.accent, o);
      });
    }
    return s;
  }
  /* ears that hang in front of the head are drawn after it */
  function frontEars(sp, st, g, c, hx) {
    var r = g.hr, hy = g.hy, s = '', o = outline(c.dark);
    if (sp.ears === 'bumps') {
      [-1, 1].forEach(function (d) { s += circle(hx + d * r * 0.5, hy - r * 0.72, r * 0.36, c.main, o); });
    } else if (sp.ears === 'floppy') {
      var L = [0.72, 0.88, 1.02][st];
      [-1, 1].forEach(function (d) {
        s += path(P('M', hx + d * r * 0.45, hy - r * 0.85, 'Q', hx + d * r * 1.28, hy - r * 0.8, hx + d * r * 1.2, hy + r * (L - 0.5), 'Q', hx + d * r * 1.05, hy + r * (L - 0.28), hx + d * r * 0.86, hy + r * (L - 0.45), 'Q', hx + d * r * 0.72, hy - r * 0.3, hx + d * r * 0.45, hy - r * 0.85, 'Z'), sp.earColor || c.dark, o);
      });
    } else if (sp.ears === 'poof') {
      [-1, 1].forEach(function (d) {
        [[0.98, -0.45], [1.08, -0.12], [1.02, 0.2], [0.92, 0.48]].forEach(function (q, i) { if (i < 2 + st) s += circle(hx + d * r * q[0], hy + r * q[1], r * 0.26, c.light, o); });
      });
    }
    return s;
  }
  function fluffyTail(x0, y0, ry, k, c, o, tipColor) {
    var s = '', d = P('M', x0, y0, 'C', x0 + 55 * k, y0 + 10, x0 + 62 * k, y0 - 70 * k, x0 + 22 * k, y0 - 78 * k,
      'C', x0 + 34 * k, y0 - 45 * k, x0 + 20 * k, y0 - 18, x0 - 6, y0 - ry * 0.5, 'Z');
    s += path(d, c.main, o);
    var tx = x0 + 22 * k, ty = y0 - 78 * k;
    s += path(P('M', tx, ty, 'C', tx + 22 * k, ty + 8, tx + 22 * k, ty + 26 * k, tx + 14 * k, ty + 34 * k, 'C', tx + 10, ty + 20 * k, tx + 2, ty + 12, tx, ty, 'Z'), tipColor, o);
    s += path(P('M', x0 + 30 * k, y0 - 10 * k, 'q', 10 * k, -8 * k, 8 * k, -22 * k, 'M', x0 + 38 * k, y0 - 30 * k, 'q', 6 * k, -8 * k, 2 * k, -18 * k), 'none', { stroke: c.dark, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.35 });
    s += path(P('M', x0 + 18 * k, y0 - 8 * k, 'Q', x0 + 34 * k, y0 - 30 * k, x0 + 26 * k, y0 - 56 * k), 'none', { stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.3 });
    return s;
  }
  function tail(sp, st, g, c, bx) {
    var by = g.by, rx = g.brx, ry = g.bry, s = '', o = outline(c.dark), k = [0.9, 1.15, 1.4][st];
    if (sp.tail === 'fluffy') {
      var x0 = bx + rx * 0.6, y0 = by + ry * 0.35;
      var d = P('M', x0, y0, 'C', x0 + 55 * k, y0 + 10, x0 + 62 * k, y0 - 70 * k, x0 + 22 * k, y0 - 78 * k,
        'C', x0 + 34 * k, y0 - 45 * k, x0 + 20 * k, y0 - 18, x0 - 6, y0 - ry * 0.5, 'Z');
      s += path(d, c.main, o);
      var tx = x0 + 22 * k, ty = y0 - 78 * k;
      s += path(P('M', tx, ty, 'C', tx + 22 * k, ty + 8, tx + 22 * k, ty + 26 * k, tx + 14 * k, ty + 34 * k, 'C', tx + 10, ty + 20 * k, tx + 2, ty + 12, tx, ty, 'Z'),
        sp.crest === 'flame' ? c.accent : c.light, o);
      if (sp.crest === 'flame' && st > 0) s += path(P('M', tx + 2, ty + 2, 'Q', tx + 6, ty - 14 * k, tx - 6, ty - 26 * k, 'Q', tx + 14, ty - 16 * k, tx + 14 * k, ty + 6), c.accent, { opacity: 0.9 });
    } else if (sp.tail === 'puff') {
      s += circle(bx + rx * 0.92, by + ry * 0.35, rx * [0.36, 0.4, 0.42][st], c.light, o);
      if (st === 2) s += circle(bx + rx * 1.02, by + ry * 0.25, 5, c.accent);
    } else if (sp.tail === 'cat' || sp.tail === 'lion' || sp.tail === 'wag' || sp.tail === 'curl' || sp.tail === 'rod') {
      var x1 = bx + rx * 0.72, y1 = by + ry * 0.2, w = sp.tail === 'lion' ? [5, 6, 7][st] : sp.tail === 'rod' ? [6, 7, 8][st] : [8, 10, 11][st], d2;
      if (sp.tail === 'cat') d2 = P('M', x1, y1, 'C', x1 + 34 * k, y1 + 8, x1 + 40 * k, y1 - 40 * k, x1 + 20 * k, y1 - 62 * k);
      else if (sp.tail === 'lion') d2 = P('M', x1, y1, 'C', x1 + 30 * k, y1 + 12, x1 + 44 * k, y1 - 20 * k, x1 + 34 * k, y1 - 46 * k);
      else if (sp.tail === 'wag') d2 = P('M', x1, y1, 'Q', x1 + 16 * k, y1 - 8, x1 + 20 * k, y1 - 30 * k);
      else if (sp.tail === 'rod') d2 = P('M', x1 - 6, y1 + 4, 'Q', x1 + 22 * k, y1 + 14 * k, x1 + 36 * k, y1 - 6 * k);
      else d2 = P('M', x1, y1, 'C', x1 + 30 * k, y1 - 4, x1 + 32 * k, y1 - 40 * k, x1 + 12 * k, y1 - 38 * k, 'C', x1, y1 - 36 * k, x1 + 2, y1 - 22 * k, x1 + 14 * k, y1 - 22 * k);
      s += path(d2, 'none', { stroke: c.dark, 'stroke-width': w + 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) + path(d2, 'none', { stroke: c.main, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      s += path(d2, 'none', { stroke: '#fff', 'stroke-width': Math.max(2, w * 0.28), 'stroke-linecap': 'round', opacity: 0.3, transform: 'translate(-1.5 -1.5)' });
      if (sp.tail === 'rod') for (var sg = 1; sg <= 3; sg++) s += circle(x1 - 6 + (40 * k) * sg / 4, y1 + 4 + 6 * k * Math.sin(sg / 4 * Math.PI), 2, c.dark);
      if (sp.tail === 'lion') s += ellipse(x1 + 34 * k, y1 - 50 * k, 7 + st * 2, 10 + st * 2, sp.maneColor || c.dark, o);
      if (sp.tail === 'cat' && sp.tipColor) s += circle(x1 + 20 * k, y1 - 62 * k, w * 0.55, sp.tipColor);
      if (sp.tail === 'wag' && sp.tipColor) s += circle(x1 + 20 * k, y1 - 30 * k, w * 0.55, sp.tipColor);
    } else if (sp.tail === 'stinger') {
      var sx = bx + rx * 0.9, sy = by + ry * 0.2;
      s += path(P('M', sx - 4, sy - 8, 'L', sx + 20 * k, sy + 2, 'L', sx - 4, sy + 10, 'Z'), INK, o);
    } else if (sp.tail === 'glow' || sp.tail === 'abdomen') {
      var gx = bx + rx * 0.82, gy = by + ry * 0.25, grx = [14, 18, 22][st], gry = [11, 14, 17][st];
      if (sp.tail === 'glow') s += circle(gx + 6, gy, grx * 1.9, c.accent, { opacity: 0.25 });
      s += ellipse(gx + 6, gy, grx, gry, sp.tail === 'glow' ? c.accent : c.main, o);
      if (sp.tail === 'abdomen') s += path(P('M', gx, gy - gry * 0.8, 'Q', gx + 4, gy, gx, gy + gry * 0.8), 'none', { stroke: c.dark, 'stroke-width': 2 });
    } else if (sp.tail === 'dragon') {
      var tx0 = bx + rx * 0.55, ty0 = by + ry * 0.35, tip = [tx0 + 32 * k, ty0 - 28 * k];
      var td = P('M', tx0, ty0, 'Q', tx0 + 30 * k, ty0 + 20 * k, tip[0], tip[1]);
      s += path(td, 'none', { stroke: c.dark, 'stroke-width': [15, 17, 19][st], 'stroke-linecap': 'round' }) + path(td, 'none', { stroke: c.main, 'stroke-width': [11, 13, 15][st], 'stroke-linecap': 'round' }) + path(td, 'none', { stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.3, transform: 'translate(-2 -2)' });
      s += path(P('M', tip[0] - 4, tip[1] + 4, 'L', tip[0] + 4, tip[1] - 16 * k, 'L', tip[0] + 18 * k, tip[1] - 2, 'L', tip[0] + 4, tip[1] + 8, 'Z'), c.accent, o);
      if (st > 0) [0.35, 0.6].forEach(function (t) { var sx2 = tx0 + 32 * k * t, sy2 = ty0 + 10 * k * Math.sin(t * Math.PI) - 8; s += path(P('M', sx2 - 5, sy2 + 2, 'L', sx2, sy2 - 9, 'L', sx2 + 5, sy2 + 2, 'Z'), c.accent, o); });
    } else if (sp.tail === 'snake') {
      var nx = bx + rx * 0.7, ny = by + ry * 0.3, hxs = nx + 26 * k, hys = ny - 62 * k, sc = '#6fae4f';
      var sd = P('M', nx, ny, 'C', nx + 44 * k, ny + 10, nx + 44 * k, ny - 40 * k, hxs, hys);
      s += path(sd, 'none', { stroke: '#3f7a2f', 'stroke-width': 12, 'stroke-linecap': 'round' }) + path(sd, 'none', { stroke: sc, 'stroke-width': 8, 'stroke-linecap': 'round' });
      s += path(P('M', hxs + 6, hys - 2, 'l 10 -3 m -10 3 l 10 3'), 'none', { stroke: '#e0455a', 'stroke-width': 2, 'stroke-linecap': 'round' });
      s += ellipse(hxs, hys - 2, 10, 8, sc, outline('#3f7a2f')) + circle(hxs + 3, hys - 5, 2, INK);
    } else if (sp.tail === 'kitsune') {
      var n = [2, 5, 9][st], kx = bx + rx * 0.55, ky = by + ry * 0.35;
      for (var i = 0; i < n; i++) {
        var ang = n === 1 ? 0 : -58 + (i * 100 / (n - 1));
        s += '<g transform="rotate(' + f(ang) + ' ' + f(kx) + ' ' + f(ky) + ')">' + fluffyTail(kx, ky, ry, 0.72 + st * 0.08, c, o, c.accent) + '</g>';
      }
    } else if (sp.tail === 'phoenix' || sp.tail === 'unicorn') {
      var px = bx + rx * 0.7, py = by + ry * 0.2;
      if (sp.tail === 'unicorn') {
        s += path(P('M', px, py - 8, 'C', px + 34 * k, py - 26 * k, px + 44 * k, py + 12 * k, px + 30 * k, py + 40 * k, 'C', px + 24 * k, py + 20 * k, px + 14 * k, py + 12, px, py + 6, 'Z'), sp.maneColor || c.accent, o);
        s += path(P('M', px + 8, py - 4, 'C', px + 28 * k, py - 12 * k, px + 32 * k, py + 12 * k, px + 26 * k, py + 30 * k), 'none', { stroke: sp.mane2 || c.light, 'stroke-width': 4, 'stroke-linecap': 'round' });
      } else {
        [[-60, 34], [-35, 38], [-10, 32]].slice(0, 1 + st).forEach(function (fa) {
          var ex = px + Math.cos(fa[0] * Math.PI / 180) * fa[1] * k, ey = py + Math.sin(fa[0] * Math.PI / 180) * fa[1] * k + 10;
          s += path(P('M', px, py, 'Q', (px + ex) / 2, ey + 12, ex, ey), 'none', { stroke: c.main, 'stroke-width': 6, 'stroke-linecap': 'round' });
          s += path(P('M', ex - 4, ey, 'Q', ex + 10, ey - 12, ex + 20, ey + 2, 'Q', ex + 8, ey + 10, ex - 4, ey, 'Z'), c.accent, o);
        });
      }
    } else if (sp.tail === 'birdtail') {
      var bx0 = bx + rx * 0.55, by0 = by + ry * 0.55;
      [-30, -5, 20].forEach(function (a2) { var L = 30 * k, ex = bx0 + Math.cos(a2 * Math.PI / 180) * L, ey = by0 + Math.sin(a2 * Math.PI / 180) * L; s += path(P('M', bx0, by0 - 5, 'Q', ex + 6, ey - 10, ex + 4, ey, 'Q', ex - 4, ey + 6, bx0, by0 + 5, 'Z'), sp.tailColor || c.main, o); });
    } else if (sp.tail === 'paddle') {
      s += '<g transform="rotate(-28 ' + f(bx + rx * 0.7) + ' ' + f(by + ry * 0.6) + ')">' +
        ellipse(bx + rx * 0.7 + 24 * k, by + ry * 0.6, 30 * k, 10 * k, c.main, o) +
        (st > 0 ? ellipse(bx + rx * 0.7 + 38 * k, by + ry * 0.6, 12 * k, 5 * k, c.accent) : '') + '</g>';
    }
    return s;
  }
  function crest(sp, st, g, c, hx) {
    var r = g.hr, top = g.hy - r, s = '', o = outline(c.dark);
    if (sp.crest === 'flame') {
      var h = [18, 26, 38][st];
      s += path(P('M', hx - 12, top + 8, 'Q', hx - 14, top - h * 0.6, hx - 2, top - h, 'Q', hx - 2, top - h * 0.45, hx + 6, top - h * 0.7,
        'Q', hx + 16, top - h * 0.2, hx + 12, top + 8, 'Z'), c.accent, outline(c.dark));
      if (st === 2) s += path(P('M', hx - 5, top + 4, 'Q', hx - 4, top - h * 0.4, hx + 3, top - h * 0.55, 'Q', hx + 7, top - 6, hx + 5, top + 4, 'Z'), '#fff6c9');
    } else if (sp.crest === 'drop') {
      var dy = g.hy - r * 0.55;
      s += path(P('M', hx, dy - 9, 'Q', hx + 7, dy + 1, hx, dy + 5, 'Q', hx - 7, dy + 1, hx, dy - 9, 'Z'), c.accent);
      if (st > 0) s += path(P('M', hx - 10, top + 6, 'Q', hx + 4, top - [0, 18, 30][st], hx + 16, top + 2, 'Q', hx + 4, top - 4, hx - 10, top + 6, 'Z'), c.accent, o);
    } else if (sp.crest === 'star') {
      var sr = [11, 14, 18][st], sy = top - sr * 0.5;
      s += path(starPath(hx, sy, sr, sr * 0.45), c.accent, outline(c.dark));
      if (st === 2) { s += path(starPath(hx - 26, top + 2, 5, 2.2), c.accent) + path(starPath(hx + 26, top + 4, 4, 1.8), c.accent); }
    } else if (sp.crest === 'bolt') {
      var bh = [16, 22, 30][st], by0 = top - 2;
      s += path(P('M', hx + 2, by0 - bh, 'L', hx - 8, by0 - bh * 0.35, 'L', hx - 1, by0 - bh * 0.35, 'L', hx - 5, by0 + 6, 'L', hx + 9, by0 - bh * 0.55, 'L', hx + 2, by0 - bh * 0.55, 'Z'), c.accent, o);
    } else if (sp.crest === 'gem') {
      var gr = [6, 7.5, 9][st], gy = g.hy - r * 0.6;
      s += path(P('M', hx, gy - gr, 'L', hx + gr * 0.8, gy, 'L', hx, gy + gr, 'L', hx - gr * 0.8, gy, 'Z'), c.accent, outline(c.dark)) + path(P('M', hx - 2, gy - gr * 0.5, 'l 3 3'), 'none', { stroke: '#fff', 'stroke-width': 2, 'stroke-linecap': 'round' });
    } else if (sp.crest === 'bubble') {
      [[0, -10, 7], [14, -24, 5], [-10, -30, 4]].slice(0, 1 + st).forEach(function (b) { s += circle(hx + b[0], top + b[1], b[2] + st, '#dff4ff', { stroke: c.dark, 'stroke-width': 1.8, opacity: 0.9 }) + circle(hx + b[0] - b[2] * 0.35, top + b[1] - b[2] * 0.35, b[2] * 0.3, '#fff'); });
    } else if (sp.crest === 'snowflake') {
      var fr = [7, 9, 11][st], fyc = g.hy - r * 0.6;
      [0, 60, 120].forEach(function (a) { var ca = Math.cos(a * Math.PI / 180) * fr, sa = Math.sin(a * Math.PI / 180) * fr; s += path(P('M', hx - ca, fyc - sa, 'L', hx + ca, fyc + sa), 'none', { stroke: c.accent, 'stroke-width': 3, 'stroke-linecap': 'round' }); });
      s += circle(hx, fyc, 2.5, '#fff');
    } else if (sp.crest === 'moon') {
      var mr = [7, 9, 11][st], my = g.hy - r * 0.6;
      s += path(P('M', hx - mr * 0.3, my - mr, 'A', mr, mr, 0, 1, 0, hx - mr * 0.3, my + mr, 'A', mr * 0.75, mr * 0.75, 0, 1, 1, hx - mr * 0.3, my - mr, 'Z'), c.accent, outline(c.dark));
    } else if (sp.crest === 'flower') {
      var fx2 = hx + r * 0.55, fy2 = top + r * 0.2, prr = [5, 6, 7.5][st];
      for (var q = 0; q < 5; q++) { var aa = q * 72 * Math.PI / 180 - Math.PI / 2; s += circle(fx2 + Math.cos(aa) * prr, fy2 + Math.sin(aa) * prr, prr * 0.85, c.accent, { stroke: c.dark, 'stroke-width': 1.2 }); }
      s += circle(fx2, fy2, prr * 0.6, '#ffe27a');
    } else if (sp.crest === 'tuft' || sp.crest === 'pom') {
      if (sp.crest === 'pom') s += circle(hx, top - 4 - st * 2, r * [0.28, 0.33, 0.38][st], c.light, o);
      else s += path(P('M', hx - 12, top + 8, 'L', hx - 8, top - 8 - st * 3, 'L', hx - 2, top + 2, 'L', hx + 3, top - 12 - st * 4, 'L', hx + 7, top + 2, 'L', hx + 13, top - 6 - st * 3, 'L', hx + 14, top + 8, 'Z'), c.main, o);
    } else if (sp.crest === 'horn') {
      var hh = [16, 26, 38][st];
      s += path(P('M', hx - 7, top + 10, 'L', hx + 2, top - hh, 'L', hx + 7, top + 10, 'Z'), sp.hornColor || '#f2c14e', outline(sp.hornDark || '#b08a2e'));
      for (var hl = 1; hl <= 2 + st; hl++) { var yy = top + 10 - (hh + 10) * hl / (3 + st); s += path(P('M', hx - 6 + 5 * hl / (3 + st), yy + 3, 'L', hx + 6 - 4 * hl / (3 + st), yy - 3), 'none', { stroke: sp.hornDark || '#b08a2e', 'stroke-width': 1.8 }); }
    } else if (sp.crest === 'horns' || sp.crest === 'goat' || sp.crest === 'rhino') {
      var hz = [12, 20, 30][st];
      if (sp.crest === 'rhino') s += path(P('M', hx - 9, g.hy - r * 0.55, 'Q', hx - 8, top - hz, hx + 8, top - hz - 8, 'Q', hx + 2, top - hz * 0.2, hx + 9, g.hy - r * 0.55, 'Z'), c.dark, o);
      else [-1, 1].forEach(function (d) {
        if (sp.crest === 'horns') s += path(P('M', hx + d * r * 0.3, top + 8, 'Q', hx + d * r * 0.48, top - hz * 0.7, hx + d * r * 0.85, top - hz, 'Q', hx + d * r * 0.62, top - hz * 0.2, hx + d * r * 0.62, top + 12, 'Z'), '#f3ead8', outline('#8a7a5a'));
        else { var gd = P('M', hx + d * r * 0.3, top + 8, 'C', hx + d * r * 0.8, top - hz, hx + d * r * 1.35, top + r * 0.1, hx + d * r * 0.98, top + r * 0.42); s += path(gd, 'none', { stroke: '#8a7a5a', 'stroke-width': 11, 'stroke-linecap': 'round' }) + path(gd, 'none', { stroke: '#e6d8b4', 'stroke-width': 7, 'stroke-linecap': 'round' }); }
      });
    } else if (sp.crest === 'nemes') {
      s += path(P('M', hx - r * 1.02, g.hy - r * 0.05, 'Q', hx - r * 1.02, g.hy - r * 1.08, hx, g.hy - r * 1.1, 'Q', hx + r * 1.02, g.hy - r * 1.08, hx + r * 1.02, g.hy - r * 0.05, 'L', hx + r * 0.78, g.hy - r * 0.12, 'Q', hx, g.hy - r * 0.7, hx - r * 0.78, g.hy - r * 0.12, 'Z'), c.accent, outline(c.dark));
      [-0.6, -0.2, 0.2, 0.6].forEach(function (k2) { s += path(P('M', hx + r * k2, g.hy - r * 1.05, 'Q', hx + r * k2 * 1.25, g.hy - r * 0.7, hx + r * k2 * 1.45, g.hy - r * 0.3), 'none', { stroke: sp.stripe || '#2956c9', 'stroke-width': 4, opacity: 0.85 }); });
      if (st > 0) s += path(P('M', hx, g.hy - r * 0.95, 'q -5 -8 0 -14 q 5 6 0 14'), '#f2c14e', outline('#a67c12'));
    } else if (sp.crest === 'feathers') {
      [-12, 0, 12].slice(st === 0 ? 1 : 0, st === 0 ? 2 : 3).forEach(function (dx, i) { var hh2 = [14, 20, 28][st] + (dx === 0 ? 6 : 0); s += path(P('M', hx + dx * 0.6, top + 8, 'Q', hx + dx - 8, top - hh2 * 0.6, hx + dx * 1.4, top - hh2, 'Q', hx + dx + 8, top - hh2 * 0.5, hx + dx * 0.6 + 4, top + 8, 'Z'), i % 2 ? c.main : c.accent, o); });
    } else if (sp.crest === 'bobble') {
      var bl = [22, 30, 38][st], sx0 = hx + 4, bxx = hx + 16, byy = top - bl;
      s += path(P('M', sx0, top + 4, 'Q', hx - 6, top - bl * 0.5, bxx, byy), 'none', { stroke: c.dark, 'stroke-width': 3.5, 'stroke-linecap': 'round' });
      s += circle(bxx, byy, 7 + st * 1.5, c.accent, outline(c.dark)) + circle(bxx - 2.5, byy - 2.5, 2.2, '#fff', { opacity: 0.8 });
      if (st === 2) s += path(starPath(bxx, byy, 5, 2.2), '#fff', { opacity: 0.9 });
    } else if (sp.crest === 'cardinal') {
      var ch = [14, 22, 30][st];
      s += path(P('M', hx - 12, top + 10, 'Q', hx - 10, top - ch * 0.8, hx + 16, top - ch, 'Q', hx + 4, top - ch * 0.35, hx + 14, top + 8, 'Z'), c.main, o);
    } else if (sp.crest === 'plumes') {
      if (st > 0) [-1, 1].forEach(function (d) { var ey = g.hy + g.ey - g.er[1] - 6; s += path(P('M', hx + d * 8, ey, 'Q', hx + d * r * 0.7, ey - 4, hx + d * r * (1.05 + st * 0.12), ey - [0, 12, 20][st], 'Q', hx + d * r * 0.8, ey + 2, hx + d * 8, ey + 3, 'Z'), c.accent, outline(c.dark)); });
    } else if (sp.crest === 'bangs') {
      /* drawn over the eyes in postFace */
    } else if (sp.crest === 'leaf') {
      var lh = [16, 20, 24][st];
      s += path(P('M', hx, top + 4, 'Q', hx + 1, top - lh * 0.6, hx - 2, top - lh), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
      s += path(P('M', hx - 2, top - lh, 'Q', hx - 22, top - lh - 10, hx - 24, top - lh + 8, 'Q', hx - 10, top - lh + 10, hx - 2, top - lh, 'Z'), c.dark === '#4e8c35' ? '#5fb043' : c.dark, o);
      s += path(P('M', hx - 2, top - lh, 'Q', hx + 18, top - lh - 14, hx + 24, top - lh + 2, 'Q', hx + 10, top - lh + 8, hx - 2, top - lh, 'Z'), c.dark === '#4e8c35' ? '#77c756' : c.main, o);
      if (st >= 1) {
        var fx = hx + r * 0.62, fy = top + r * 0.25, pr = st === 2 ? 6 : 4.5;
        for (var i = 0; i < 5; i++) {
          var a = i * 72 * Math.PI / 180;
          s += circle(fx + Math.cos(a) * pr, fy + Math.sin(a) * pr, pr * 0.85, c.accent);
        }
        s += circle(fx, fy, pr * 0.6, '#ffe27a');
      }
    }
    return s;
  }
  function starPath(cx, cy, R, r) {
    var pts = [];
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; pts.push(f(cx + Math.cos(a) * rad) + ' ' + f(cy + Math.sin(a) * rad)); }
    return 'M' + pts.join(' L') + ' Z';
  }
  function wings(sp, st, g, c, bx, by) {
    var wt = sp.wings || (sp.crest === 'star' ? 'star' : null);
    if (!wt || (sp.wingsFrom || 0) > st) return '';
    if (wt !== 'star') return wings2(wt, sp, st, g, c, bx, by);
    if (st < 1) return '';
    var s = '', span = [0, 38, 54][st];
    [-1, 1].forEach(function (d) {
      var x = bx + d * g.brx * 0.6, y = by - g.bry * 0.4;
      s += path(P('M', x, y, 'Q', x + d * span, y - span * 0.9, x + d * span * 1.1, y - span * 0.2, 'Q', x + d * span * 0.7, y + 4, x + d * span * 0.9, y + span * 0.4, 'Q', x + d * span * 0.4, y + 10, x, y + 8, 'Z'), c.light, outline(c.dark));
      s += path(P('M', x + d * span * 0.3, y - span * 0.2, 'Q', x + d * span * 0.7, y - span * 0.5, x + d * span * 0.95, y - span * 0.15), 'none', { stroke: c.accent, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    });
    return s;
  }
  function wings2(wt, sp, st, g, c, bx, by) {
    var s = '', span = [24, 40, 56][st], o = outline(c.dark);
    [-1, 1].forEach(function (d) {
      var x = bx + d * g.brx * 0.5, y = by - g.bry * 0.45;
      if (wt === 'bug') {
        s += '<g transform="rotate(' + (d * -28) + ' ' + f(x) + ' ' + f(y) + ')">' + ellipse(x + d * span * 0.62, y - 2, span * 0.62, span * 0.24, '#e3f5ff', { stroke: '#7fa8c8', 'stroke-width': 2, opacity: 0.85 }) + '</g>';
        s += '<g transform="rotate(' + (d * 8) + ' ' + f(x) + ' ' + f(y) + ')">' + ellipse(x + d * span * 0.5, y + 6, span * 0.46, span * 0.18, '#e3f5ff', { stroke: '#7fa8c8', 'stroke-width': 2, opacity: 0.85 }) + '</g>';
        s += '<g transform="rotate(' + (d * -28) + ' ' + f(x) + ' ' + f(y) + ')">' + path(P('M', x + d * 4, y - 2, 'L', x + d * span * 1.1, y - 2, 'M', x + d * span * 0.4, y - 2, 'l', d * span * 0.3, -span * 0.14, 'M', x + d * span * 0.7, y - 2, 'l', d * span * 0.25, span * 0.13), 'none', { stroke: '#7fa8c8', 'stroke-width': 1.3, opacity: 0.8 }) + ellipse(x + d * span * 0.45, y - span * 0.08, span * 0.18, span * 0.05, '#fff', { opacity: 0.8 }) + '</g>';
      } else if (wt === 'butterfly') {
        s += path(P('M', x, y, 'C', x + d * span * 0.4, y - span * 1.25, x + d * span * 1.35, y - span * 1.05, x + d * span * 1.05, y - span * 0.15, 'Q', x + d * span * 0.6, y + 2, x, y + 4, 'Z'), c.accent, o);
        s += path(P('M', x, y + 4, 'C', x + d * span * 0.9, y + span * 0.1, x + d * span * 0.95, y + span * 0.75, x + d * span * 0.35, y + span * 0.55, 'Q', x + d * 4, y + span * 0.3, x, y + 8, 'Z'), c.main, o);
        s += circle(x + d * span * 0.72, y - span * 0.55, span * 0.16, c.light, outline(c.dark)) + circle(x + d * span * 0.52, y + span * 0.32, span * 0.1, c.light);
      } else if (wt === 'bat') {
        s += path(P('M', x, y, 'L', x + d * span * 1.15, y - span * 0.95, 'L', x + d * span * 1.12, y - span * 0.1, 'Q', x + d * span * 0.98, y - span * 0.22, x + d * span * 0.82, y - span * 0.02, 'Q', x + d * span * 0.66, y - span * 0.18, x + d * span * 0.48, y + span * 0.1, 'Q', x + d * span * 0.25, y - span * 0.02, x, y + 10, 'Z'), c.accent, o);
        s += path(P('M', x, y, 'L', x + d * span * 1.15, y - span * 0.95, 'M', x + d * span * 0.5, y - span * 0.45, 'L', x + d * span * 0.82, y - span * 0.02, 'M', x + d * span * 0.3, y - span * 0.25, 'L', x + d * span * 0.48, y + span * 0.1), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
      } else if (wt === 'flipper') {
        s += '<g transform="rotate(' + (d * 28) + ' ' + f(x + d * 6) + ' ' + f(y + 4) + ')">' + ellipse(x + d * (g.brx * 0.55), y + g.bry * 0.35, g.brx * 0.2, g.bry * 0.55, c.main, o) + '</g>';
      } else if (wt === 'folded') {
        s += path(P('M', x + d * g.brx * 0.35, y - 4, 'Q', x + d * g.brx * 0.75, y + g.bry * 0.2, x + d * g.brx * 0.62, y + g.bry * 1.05, 'Q', x + d * g.brx * 0.3, y + g.bry * 0.55, x + d * g.brx * 0.35, y - 4, 'Z'), sp.wingColor || c.dark, o);
        s += path(P('M', x + d * g.brx * 0.52, y + g.bry * 0.3, 'l', d * 4, 10, 'M', x + d * g.brx * 0.6, y + g.bry * 0.55, 'l', d * 3, 9), 'none', { stroke: '#fff', 'stroke-width': 1.5, opacity: 0.5, 'stroke-linecap': 'round' });
      } else if (wt === 'feather' || wt === 'fire') {
        var fill = wt === 'fire' ? c.accent : (sp.wingColor || c.light);
        s += path(P('M', x, y, 'Q', x + d * span * 0.55, y - span * 1.05, x + d * span * 1.25, y - span * 0.85, 'Q', x + d * span * 1.02, y - span * 0.45, x + d * span * 1.12, y - span * 0.22, 'Q', x + d * span * 0.82, y - span * 0.1, x + d * span * 0.92, y + span * 0.12, 'Q', x + d * span * 0.52, y + span * 0.02, x + d * span * 0.55, y + span * 0.3, 'Q', x + d * span * 0.22, y + span * 0.1, x, y + 10, 'Z'), fill, o);
        s += path(P('M', x + d * span * 0.3, y - span * 0.3, 'Q', x + d * span * 0.7, y - span * 0.62, x + d * span * 1.05, y - span * 0.62, 'M', x + d * span * 0.3, y - span * 0.05, 'Q', x + d * span * 0.6, y - span * 0.22, x + d * span * 0.88, y - span * 0.12), 'none', { stroke: wt === 'fire' ? c.main : c.dark, 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.7 });
        if (wt === 'fire' && st > 0) s += path(P('M', x + d * span * 1.1, y - span * 0.85, 'q', d * 10, -14, d * 2, -26, 'q', d * 14, 8, d * 8, 28), c.main, { opacity: 0.9 });
      }
    });
    return s;
  }
  /* body markings, drawn over the body */
  function pattern(sp, st, g, c, bx, by, brx, bry) {
    var s = '', pt = sp.pattern, o = outline(c.dark);
    function band(y1, y2, col) {
      function w(y) { var t = (y - by) / bry; return brx * Math.sqrt(Math.max(0, 1 - t * t)); }
      return path(P('M', bx - w(y1), y1, 'Q', bx, y1 + 5, bx + w(y1), y1, 'L', bx + w(y2), y2, 'Q', bx, y2 + 5, bx - w(y2), y2, 'Z'), col);
    }
    if (pt === 'stripes') [-1, 1].forEach(function (d) { for (var i = 0; i < 3; i++) s += path(P('M', bx + d * brx * 0.96, by - bry * 0.35 + i * bry * 0.32, 'Q', bx + d * brx * 0.7, by - bry * 0.28 + i * bry * 0.32, bx + d * brx * 0.5, by - bry * 0.18 + i * bry * 0.32), 'none', { stroke: c.dark, 'stroke-width': 4, 'stroke-linecap': 'round' }); });
    else if (pt === 'spots') [[-0.55, -0.3, 6], [0.5, -0.15, 5], [-0.25, 0.4, 5], [0.35, 0.45, 6], [0.05, -0.55, 4]].forEach(function (q) { s += ellipse(bx + brx * q[0], by + bry * q[1], q[2] + st, (q[2] + st) * 0.85, sp.spotColor || c.dark); });
    else if (pt === 'bee') { s += band(by - bry * 0.28, by - bry * 0.08, INK) + band(by + bry * 0.22, by + bry * 0.44, INK); }
    else if (pt === 'segments') { [-0.45, -0.1, 0.25, 0.58].forEach(function (t) { var y = by + bry * t, w = brx * Math.sqrt(1 - t * t); s += path(P('M', bx - w, y, 'Q', bx, y + 8, bx + w, y), 'none', { stroke: c.dark, 'stroke-width': 3 }); }); }
    else if (pt === 'ladybug' || pt === 'beetle') {
      s += ellipse(bx, by - bry * 0.05, brx * 0.98, bry * 0.95, c.main, o);
      s += path(P('M', bx, by - bry, 'L', bx, by + bry * 0.9), 'none', { stroke: c.dark, 'stroke-width': 3 });
      if (pt === 'ladybug') [[-0.5, -0.3], [0.5, -0.3], [-0.45, 0.35], [0.45, 0.35], [0, 0.72]].slice(0, 2 + st + (st === 2 ? 1 : 0)).forEach(function (q) { s += circle(bx + brx * q[0], by + bry * q[1], 5 + st, INK); });
      else s += ellipse(bx - brx * 0.45, by - bry * 0.45, brx * 0.2, bry * 0.12, '#fff', { opacity: 0.45 });
    } else if (pt === 'snail') {
      var sx = bx + brx * 0.28, sy = by - bry * 0.35, sr = bry * [0.85, 0.95, 1.05][st];
      s += circle(sx, sy, sr, c.accent, o);
      s += path(P('M', sx, sy, 'm -2 0 a 3 3 0 1 1 5 2 a 8 8 0 1 1 -12 -6 a 14 14 0 1 1 22 10'), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
    } else if (pt === 'chevrons') { for (var cv = 0; cv < 3; cv++) [-1, 1].forEach(function (d) { var yy = by + bry * (0.02 + cv * 0.22), xx = bx + d * brx * 0.18; s += path(P('M', xx - 5, yy, 'L', xx, yy + 5, 'L', xx + 5, yy), 'none', { stroke: c.dark, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.5 }); });
    } else if (pt === 'scales') { for (var i2 = 0; i2 < 3; i2++) { var yy = by - 2 + i2 * bry * 0.28; s += path(P('M', bx - brx * 0.35, yy, 'Q', bx, yy + 6, bx + brx * 0.35, yy), 'none', { stroke: c.dark, 'stroke-width': 2, opacity: 0.45 }); } }
    return s;
  }
  function legs6(sp, st, g, c, bx, by, brx, bry) {
    if (!sp.legs6) return '';
    var s = '';
    [-1, 1].forEach(function (d) { for (var i = 0; i < 2; i++) { var y = by - bry * 0.1 + i * bry * 0.35; s += path(P('M', bx + d * brx * 0.85, y, 'L', bx + d * (brx + 12), y - 6 + i * 12, 'L', bx + d * (brx + 16), y + 4 + i * 10), 'none', { stroke: c.dark, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); } });
    return s;
  }
  /* things behind the head: manes, headdress flaps */
  function behindHead(sp, st, g, c, hx) {
    var s = '', r = g.hr, o = outline(c.dark);
    if (sp.mane === 'lion') {
      var mk = [0.55, 0.85, 1.05][st], n = 14;
      for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; s += circle(hx + Math.cos(a) * r * (0.9 + 0.12 * mk), g.hy + Math.sin(a) * r * (0.9 + 0.12 * mk), r * 0.3 * mk, sp.maneColor || c.dark, o); }
    } else if (sp.mane === 'unicorn') {
      s += path(P('M', hx + r * 0.1, g.hy - r * 0.98, 'C', hx - r * 1.2, g.hy - r * 1.1, hx - r * (1.3 + st * 0.12), g.hy + r * 0.3, hx - r * 0.95, g.hy + r * (0.9 + st * 0.15), 'Q', hx - r * 0.75, g.hy, hx + r * 0.1, g.hy - r * 0.98, 'Z'), sp.maneColor || c.accent, o);
      s += path(P('M', hx - r * 0.3, g.hy - r * 0.9, 'C', hx - r * 1.0, g.hy - r * 0.7, hx - r * 1.05, g.hy + r * 0.2, hx - r * 0.85, g.hy + r * 0.7), 'none', { stroke: sp.mane2 || c.light, 'stroke-width': 4, 'stroke-linecap': 'round' });
    }
    if (sp.crest === 'nemes') [-1, 1].forEach(function (d) { s += path(P('M', hx + d * r * 0.95, g.hy - r * 0.3, 'L', hx + d * r * 1.22, g.hy + r * 0.95, 'L', hx + d * r * 0.62, g.hy + r * 0.95, 'Z'), c.accent, o) + path(P('M', hx + d * r * 1.02, g.hy + r * 0.2, 'L', hx + d * r * 0.7, g.hy + r * 0.2, 'M', hx + d * r * 1.12, g.hy + r * 0.58, 'L', hx + d * r * 0.66, g.hy + r * 0.58), 'none', { stroke: sp.stripe || '#2956c9', 'stroke-width': 4 }); });
    return s;
  }
  /* face markings on top of the head circle, under the eyes */
  function faceMarks(sp, st, g, c, hx) {
    var s = '', r = g.hr, f2 = sp.face || [];
    if (f2.indexOf('mask') >= 0) {
      s += path(P('M', hx - r * 0.97, g.hy - r * 0.05, 'Q', hx - r * 0.92, g.hy - r * 0.95, hx, g.hy - r, 'Q', hx + r * 0.92, g.hy - r * 0.95, hx + r * 0.97, g.hy - r * 0.05, 'Q', hx + r * 0.45, g.hy - r * 0.02, hx, g.hy + r * 0.2, 'Q', hx - r * 0.45, g.hy - r * 0.02, hx - r * 0.97, g.hy - r * 0.05, 'Z'), c.dark);
      [-1, 1].forEach(function (d) { s += ellipse(hx + d * g.ed, g.hy + g.ey, g.er[0] * 1.7, g.er[1] * 1.45, c.light); });
    }
    if (f2.indexOf('beakmask') >= 0) s += ellipse(hx, g.hy + r * 0.28, r * 0.48, r * 0.3, INK);
    if (f2.indexOf('owldisc') >= 0) [-1, 1].forEach(function (d) { s += circle(hx + d * g.ed, g.hy + g.ey, g.er[0] * 2.35, c.light, { stroke: c.dark, 'stroke-width': 1.8 }); });
    if (f2.indexOf('patch') >= 0) s += ellipse(hx + g.ed, g.hy + g.ey, g.er[0] * 2.1, g.er[1] * 1.75, c.dark);
    if (f2.indexOf('forehead') >= 0) [-8, 0, 8].forEach(function (dx) { s += path(P('M', hx + dx, g.hy - r * 0.9, 'L', hx + dx * 0.8, g.hy - r * 0.62), 'none', { stroke: c.dark, 'stroke-width': 3.5, 'stroke-linecap': 'round' }); });
    if (f2.indexOf('tears') >= 0) [-1, 1].forEach(function (d) { s += path(P('M', hx + d * (g.ed - 3), g.hy + g.ey + g.er[1], 'Q', hx + d * (g.ed - 6), g.hy + r * 0.3, hx + d * 9, g.hy + r * 0.38), 'none', { stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' }); });
    return s;
  }
  /* on top of eyes and mouth */
  function postFace(sp, st, g, c, hx, mood) {
    var s = '', r = g.hr, f2 = sp.face || [];
    if (f2.indexOf('whiskers') >= 0) [-1, 1].forEach(function (d) { [-4, 2, 8].forEach(function (dy) { s += path(P('M', hx + d * r * 0.45, g.hy + r * 0.36 + dy * 0.4, 'L', hx + d * r * 0.95, g.hy + r * 0.28 + dy), 'none', { stroke: c.dark, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.75 }); }); });
    if (f2.indexOf('kohl') >= 0 && mood !== 'asleep' && mood !== 'happy' && mood !== 'eat') [-1, 1].forEach(function (d) { s += path(P('M', hx + d * (g.ed + g.er[0] * 0.8), g.hy + g.ey - 1, 'l', d * 8, -4), 'none', { stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' }); });
    if (sp.crest === 'bangs') {
      var top = g.hy - r, by2 = g.hy + g.ey + [2, 0, -2][st];
      s += path(P('M', hx - r * 0.98, g.hy, 'Q', hx - r, top - 2, hx, top - 4, 'Q', hx + r, top - 2, hx + r * 0.98, g.hy, 'Q', hx + r * 0.7, by2 + 6, hx + r * 0.5, by2, 'Q', hx + r * 0.3, by2 + 8, hx, by2 + 2, 'Q', hx - r * 0.3, by2 + 8, hx - r * 0.5, by2, 'Q', hx - r * 0.7, by2 + 6, hx - r * 0.98, g.hy, 'Z'), c.light, outline(c.dark));
    }
    if (sp.fangs && st > 0 && mood !== 'hungry' && mood !== 'eat') { var my = g.hy + g.hr * 0.42; [-1, 1].forEach(function (d) { s += path(P('M', hx + d * 3, my + 1, 'L', hx + d * 5.5, my + 7, 'L', hx + d * 8, my + 0.5, 'Z'), '#fff', { stroke: c.dark, 'stroke-width': 1 }); }); }
    return s;
  }
  function collar(sp, st, g, c, hx) {
    if (!sp.collar || st < 1) return '';
    var y = g.hy + g.hr * 0.86, s = path(P('M', hx - g.hr * 0.7, y - 4, 'Q', hx, y + 10, hx + g.hr * 0.7, y - 4, 'L', hx + g.hr * 0.7, y + 4, 'Q', hx, y + 18, hx - g.hr * 0.7, y + 4, 'Z'), '#b3262a', outline('#6a1216'));
    [-0.45, 0, 0.45].forEach(function (k) { s += path(P('M', hx + g.hr * k - 4, y + 8 - Math.abs(k) * 8, 'L', hx + g.hr * k, y + 16 - Math.abs(k) * 8, 'L', hx + g.hr * k + 4, y + 8 - Math.abs(k) * 8, 'Z'), '#d8d8d8', outline('#777')); });
    return s;
  }
  /* Accessories sit on the head or neck; drawn inside the scaled group. */
  function accessory(id, g, hx, c) {
    var r = g.hr, top = g.hy - r, s = '', ey = g.hy + g.ey;
    switch (id) {
      case 'strawhat':
        s += ellipse(hx, top + 8, r * 1.15, r * 0.24, '#e9c46a', { stroke: '#b08a2e', 'stroke-width': 2 });
        s += path(P('M', hx - r * 0.55, top + 8, 'Q', hx - r * 0.5, top - r * 0.5, hx, top - r * 0.52, 'Q', hx + r * 0.5, top - r * 0.5, hx + r * 0.55, top + 8, 'Z'), '#f2d27a', { stroke: '#b08a2e', 'stroke-width': 2 });
        s += path(P('M', hx - r * 0.55, top + 2, 'Q', hx, top - 4, hx + r * 0.55, top + 2), 'none', { stroke: '#e45757', 'stroke-width': 5 });
        break;
      case 'sunglasses':
        [-1, 1].forEach(function (d) { s += el('rect', { x: f(hx + d * g.ed - g.er[0] * 1.5), y: f(ey - g.er[1] * 0.9), width: f(g.er[0] * 3), height: f(g.er[1] * 1.6), rx: 5, fill: '#1e2430', stroke: '#0a0d12', 'stroke-width': 2 }); });
        s += path(P('M', hx - g.ed + g.er[0] * 1.5, ey - 3, 'L', hx + g.ed - g.er[0] * 1.5, ey - 3), 'none', { stroke: '#0a0d12', 'stroke-width': 3 });
        s += path(P('M', hx - g.ed - 4, ey - 6, 'l 6 0'), 'none', { stroke: '#8aa4c8', 'stroke-width': 2, opacity: 0.7 });
        break;
      case 'lei':
        for (var i = -3; i <= 3; i++) {
          var lx = hx + i * r * 0.26, ly = g.hy + r * 0.92 + Math.abs(i) * -2.5, col = ['#ff7aa8', '#ffd84a', '#ff9f4a', '#c59cff'][(i + 3) % 4];
          for (var k = 0; k < 5; k++) { var a = k * 1.2566; s += circle(lx + Math.cos(a) * 4.5, ly + Math.sin(a) * 4.5, 4, col); }
          s += circle(lx, ly, 2.5, '#fff6c9');
        }
        break;
      case 'sailor':
        s += path(P('M', hx - r * 0.62, top + 10, 'Q', hx, top - r * 0.55, hx + r * 0.62, top + 10, 'Z'), '#ffffff', { stroke: '#9aa4b2', 'stroke-width': 2 });
        s += el('rect', { x: f(hx - r * 0.66), y: f(top + 4), width: f(r * 1.32), height: 9, rx: 3, fill: '#2a4a8f' });
        break;
      case 'captain':
        s += path(P('M', hx - r * 0.7, top + 8, 'Q', hx - r * 0.8, top - r * 0.45, hx, top - r * 0.5, 'Q', hx + r * 0.8, top - r * 0.45, hx + r * 0.7, top + 8, 'Z'), '#1f2f5c', { stroke: '#0f1a38', 'stroke-width': 2 });
        s += path(P('M', hx - r * 0.72, top + 8, 'Q', hx, top + 20, hx + r * 0.72, top + 8, 'Z'), '#0f1a38');
        s += path(starPath(hx, top - r * 0.12, 7, 3), '#ffd84a');
        break;
      case 'crown':
        s += path(P('M', hx - r * 0.55, top + 6, 'L', hx - r * 0.62, top - r * 0.38, 'L', hx - r * 0.3, top - r * 0.12, 'L', hx, top - r * 0.5, 'L', hx + r * 0.3, top - r * 0.12, 'L', hx + r * 0.62, top - r * 0.38, 'L', hx + r * 0.55, top + 6, 'Z'), '#f2c14e', { stroke: '#a67c12', 'stroke-width': 2, 'stroke-linejoin': 'round' });
        [-0.62, 0, 0.62].forEach(function (k, j) { s += circle(hx + k * r, top - r * (j === 1 ? 0.5 : 0.38), 4, '#fbf6ee', { stroke: '#d8cbb0', 'stroke-width': 1 }); });
        s += circle(hx, top - 2, 4, '#e45757');
        break;
      case 'bandana':
        s += path(P('M', hx - r * 0.7, g.hy + r * 0.78, 'Q', hx, g.hy + r * 1.05, hx + r * 0.7, g.hy + r * 0.78, 'L', hx + r * 0.2, g.hy + r * 1.35, 'Z'), '#e45757', { stroke: '#a63030', 'stroke-width': 2 });
        s += circle(hx - 6, g.hy + r * 0.98, 2, '#fff') + circle(hx + 8, g.hy + r * 1.05, 2, '#fff');
        break;
    }
    return s;
  }
  function extras(sp, st, g, c, hx) {
    if (st < 2) return '';
    var s = '', neckY = g.hy + g.hr * 0.82;
    if (sp.crest === 'flame') {
      for (var i = -2; i <= 2; i++) {
        var x = hx + i * 11;
        s += path(P('M', x - 8, neckY, 'Q', x - 4, neckY + 16, x, neckY + 22, 'Q', x + 4, neckY + 16, x + 8, neckY, 'Z'), i % 2 ? c.accent : c.main, outline(c.dark));
      }
    } else if (sp.crest === 'drop') {
      [-1, 1].forEach(function (d) {
        var x = hx + d * g.brx * 0.95, y = g.by - 4;
        s += path(P('M', x, y - 14, 'Q', x + d * 26, y - 6, x + d * 20, y + 16, 'Q', x + d * 8, y + 6, x, y + 8, 'Z'), c.accent, outline(c.dark));
      });
    } else if (sp.crest === 'leaf') {
      for (var j = -2; j <= 2; j++) {
        var lx = hx + j * 12, ly = neckY + 4 + Math.abs(j) * -2;
        s += path(P('M', lx, ly - 4, 'Q', lx - 9, ly + 8, lx, ly + 16, 'Q', lx + 9, ly + 8, lx, ly - 4, 'Z'), j % 2 ? '#6fbf4f' : '#4f9a37', { stroke: '#356b25', 'stroke-width': 1.5 });
      }
    }
    return s;
  }
  function lum(hex) { var n = parseInt(String(hex).slice(1), 16); return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255; }
  function eyes(st, g, c, hx, mood, sp, sides) {
    var ek = (sp && sp.eyeScale) || 1, s = '', ey = g.hy + g.ey, rx = g.er[0] * ek, ry = g.er[1] * ek, darkFur = lum(c.main) < 0.32;
    (sides || [-1, 1]).forEach(function (d) {
      var x = hx + d * g.ed;
      if (darkFur && mood !== 'asleep' && mood !== 'eat' && mood !== 'happy') s += ellipse(x, ey, rx + 3.5, ry + 3.5, c.accent === '#2b2233' ? '#f4f1ea' : c.light);
      if (mood === 'asleep' || mood === 'eat') {
        s += path(P('M', x - rx, ey, 'Q', x, ey + ry * 0.8, x + rx, ey), 'none', { stroke: darkFur ? c.light : INK, 'stroke-width': 3, 'stroke-linecap': 'round' });
      } else if (mood === 'happy') {
        s += path(P('M', x - rx, ey + 2, 'Q', x, ey - ry * 1.1, x + rx, ey + 2), 'none', { stroke: darkFur ? c.light : INK, 'stroke-width': 3.2, 'stroke-linecap': 'round' });
      } else {
        var iris = (sp && sp.eye) || mix(lum(c.accent) > 0.8 ? c.dark : c.accent, INK, 0.35);
        s += ellipse(x, ey, rx, ry, INK);
        s += ellipse(x, ey + ry * 0.28, rx * 0.8, ry * 0.6, iris);
        s += ellipse(x, ey + ry * 0.4, rx * 0.55, ry * 0.32, mix(iris, '#ffffff', 0.35), { opacity: 0.8 });
        s += ellipse(x, ey + ry * 0.12, rx * 0.46, ry * 0.46, INK);
        s += circle(x - rx * 0.3, ey - ry * 0.36, rx * 0.4, '#fff');
        s += circle(x + rx * 0.38, ey + ry * 0.38, rx * 0.17, '#fff');
        s += circle(x + rx * 0.42, ey - ry * 0.52, rx * 0.1, '#fff', { opacity: 0.9 });
        if (mood === 'sleepy' || mood === 'lazy') s += path(P('M', x - rx - 2, ey - ry - 2, 'L', x + rx + 2, ey - ry - 2, 'L', x + rx + 2, ey - (mood === 'sleepy' ? 0 : ry * 0.35), 'Q', x, ey + (mood === 'sleepy' ? 3 : -ry * 0.1), x - rx - 2, ey - (mood === 'sleepy' ? 0 : ry * 0.35), 'Z'), c.main);
        if (st === 2 && mood !== 'sleepy' && mood !== 'lazy' && mood !== 'hungry' && mood !== 'grubby') s += path(P('M', x - d * rx * 0.9, ey - ry - 2, 'Q', x + d * rx * 0.2, ey - ry - 6, x + d * rx * 1.3, ey - ry - 7), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
        if (mood === 'hungry' || mood === 'grubby') s += path(P('M', x - d * rx * 1.1, ey - ry - 1, 'L', x + d * rx * 0.8, ey - ry - 6), 'none', { stroke: c.dark, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
      }
    });
    return s;
  }
  function mouth(sp, g, c, hx, mood) {
    var my = g.hy + g.hr * 0.42, s = '';
    if (sp.muzzle === 'beak') {
      var open = mood === 'hungry' || mood === 'eat';
      s += path(P('M', hx - 10, my - 10, 'Q', hx, my - 14, hx + 10, my - 10, 'L', hx, my + (open ? 4 : 8), 'Z'), sp.beakColor || '#f2b632', outline('#a8741a'));
      if (open) s += path(P('M', hx - 7, my + 2, 'L', hx + 7, my + 2, 'L', hx, my + 12, 'Z'), sp.beakColor || '#f2b632', outline('#a8741a'));
      return s;
    }
    if (sp.muzzle === 'goofy' && (mood === 'ok' || mood === 'happy')) {
      s += path(P('M', hx - 13, my - 4, 'Q', hx, my + (mood === 'happy' ? 18 : 14), hx + 13, my - 4, 'Z'), '#7a2a3a', { stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' });
      s += path(P('M', hx + 1, my + 3, 'Q', hx + 3, my + 16, hx + 9, my + 14, 'Q', hx + 13, my + 8, hx + 10, my + 1, 'Z'), '#f47a8a', { stroke: '#b8455a', 'stroke-width': 1.5 }) + path(P('M', hx + 6, my + 4, 'l 0.5 7'), 'none', { stroke: '#b8455a', 'stroke-width': 1.2 });
      return s;
    }
    if (sp.muzzle === 'wide' || sp.muzzle === 'goofy') {
      var ww = g.hr * 0.5;
      if (mood === 'hungry' || mood === 'eat') return s + ellipse(hx, my + 1, ww * 0.5, mood === 'eat' ? 8 : 5, '#7a2a3a');
      if (mood === 'grubby' || mood === 'lazy' || mood === 'sleepy') return s + path(P('M', hx - ww * 0.6, my + 2, 'Q', hx, my - 1, hx + ww * 0.6, my + 2), 'none', { stroke: INK, 'stroke-width': 2.4, 'stroke-linecap': 'round' });
      return s + path(P('M', hx - ww, my - 4, 'Q', hx, my + (mood === 'happy' ? 12 : 8), hx + ww, my - 4), 'none', { stroke: INK, 'stroke-width': 2.4, 'stroke-linecap': 'round' }) + circle(hx - 4, my - 9, 1.4, INK) + circle(hx + 4, my - 9, 1.4, INK);
    }
    if (sp.muzzle === 'snout') s += ellipse(hx, my - 1, g.hr * 0.44, g.hr * 0.3, sp.snoutColor || c.light);
    else if (sp.muzzle) s += ellipse(hx, my - 2, g.hr * 0.36, g.hr * 0.24, c.light);
    s += sp.muzzle === 'snout' ? ellipse(hx, my - 7, 5.5, 4, INK) + ellipse(hx - 1.5, my - 8.5, 1.8, 1.1, '#fff', { opacity: 0.7 }) : ellipse(hx, my - 7, 3.6, 2.6, INK) + ellipse(hx - 1, my - 8, 1.2, 0.8, '#fff', { opacity: 0.7 });
    if (sp.muzzle === 'snout' && mood === 'happy') s += path(P('M', hx - 3, my + 2, 'Q', hx, my + 11, hx + 3, my + 2, 'Z'), '#f47a8a', { stroke: '#b8455a', 'stroke-width': 1.2 });
    if (mood === 'hungry' || mood === 'eat') s += ellipse(hx, my + 3, 4.5, mood === 'eat' ? 6 : 4, '#7a2a3a');
    else if (mood === 'grubby' || mood === 'lazy' || mood === 'sleepy') s += path(P('M', hx - 5, my + 3, 'Q', hx, my - 0.5, hx + 5, my + 3), 'none', { stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' });
    else s += path(P('M', hx - 7, my, 'Q', hx - 3.5, my + (mood === 'happy' ? 7 : 4), hx, my, 'Q', hx + 3.5, my + (mood === 'happy' ? 7 : 4), hx + 7, my), 'none', { stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    return s;
  }
  function moodFx(g, hx, mood) {
    var s = '';
    if (mood === 'grubby') {
      [[-22, 12, 7], [18, 22, 6], [-6, -18, 5], [24, -8, 4]].forEach(function (m) { s += ellipse(hx + m[0], g.hy + m[1], m[2] * 1.3, m[2], '#8a6a4a', { opacity: 0.75 }); });
      [[-10, g.by + 4, 8], [14, g.by + 10, 6]].forEach(function (m) { s += ellipse(hx + m[0], m[1], m[2] * 1.3, m[2], '#8a6a4a', { opacity: 0.75 }); });
      s += path(P('M', hx + 52, g.hy - 20, 'q 6 -6 0 -12 q -6 -6 0 -12'), 'none', { stroke: '#8fa06a', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
      s += path(P('M', hx + 62, g.hy - 12, 'q 6 -6 0 -12 q -6 -6 0 -12'), 'none', { stroke: '#8fa06a', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    } else if (mood === 'asleep' || mood === 'sleepy') {
      var zx = hx + g.hr * 0.9, zy = g.hy - g.hr * 0.9;
      s += el('text', { x: f(zx), y: f(zy), 'font-size': 18, 'font-weight': 700, fill: '#6b7fd6', 'font-family': 'sans-serif' }, 'z');
      s += el('text', { x: f(zx + 12), y: f(zy - 14), 'font-size': 13, 'font-weight': 700, fill: '#6b7fd6', 'font-family': 'sans-serif' }, 'z');
    } else if (mood === 'hungry') {
      s += path(P('M', hx + 4, g.hy + g.hr * 0.52, 'q 2 8 0 10 q -3 -3 0 -10'), '#9ad6ff');
    } else if (mood === 'lazy') {
      s += path(P('M', hx - g.hr - 6, g.hy - 6, 'l -8 -2 M', hx - g.hr - 6, g.hy + 2, 'l -9 1'), 'none', { stroke: '#9aa4b2', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    }
    return s;
  }

  /* opts.flags: thin (starving: skinny and dull), dirty (mud, messy hair, green stink), tired (eye bags, droopy lids), pudgy (no exercise: round and grumpy)
     opts.blink closes the eyes; opts.tailRot swings the tail (degrees). Both are used as animation frames in the town.
     Inline SVGs animate with CSS: .cre-breathe, .cre-eyes (blink), .cre-tail (wag), .cre-wings (flap) in styles.css. */
  var UID = 0;
  function mix(a, b, t) {
    var x = parseInt(String(a).slice(1), 16), y = parseInt(String(b).slice(1), 16);
    function ch(n, sh) { return (n >> sh) & 255; }
    function h2(v) { v = Math.round(v); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + h2(ch(x, 16) + (ch(y, 16) - ch(x, 16)) * t) + h2(ch(x, 8) + (ch(y, 8) - ch(x, 8)) * t) + h2(ch(x, 0) + (ch(y, 0) - ch(x, 0)) * t);
  }
  /* volume: a soft highlight top-left and shade bottom-right laid over a round shape */
  function volume(id, cx, cy, rx, ry) { return ellipse(cx, cy, rx, ry, 'url(#' + id + 'v)'); }
  function fluffs(sp, g, c, hx) {
    if (sp.family === 'bug' || sp.muzzle === 'beak' || sp.smooth) return '';
    var r = g.hr, s = '';
    [-1, 1].forEach(function (d) {
      s += path(P('M', hx + d * r * 0.86, g.hy - r * 0.02, 'L', hx + d * r * 1.12, g.hy + r * 0.1, 'L', hx + d * r * 0.98, g.hy + r * 0.22, 'L', hx + d * r * 1.14, g.hy + r * 0.36, 'L', hx + d * r * 0.9, g.hy + r * 0.46, 'L', hx + d * r * 0.8, g.hy + r * 0.3, 'Z'), c.main, { stroke: c.dark, 'stroke-width': 2.2, 'stroke-linejoin': 'round' });
    });
    return s;
  }
  function chestFluff(sp, g, c, bx, by, brx, bry) {
    if (sp.family === 'bug' || sp.smooth || sp.pattern === 'ladybug' || sp.pattern === 'beetle') return '';
    var y = by - bry * 0.52, w = brx * 0.5, s = 'M' + f(bx - w) + ' ' + f(y);
    for (var i = 0; i < 5; i++) { var x0 = bx - w + (i + 0.5) * (2 * w / 5); s += ' L' + f(x0) + ' ' + f(y + 9) + ' L' + f(bx - w + (i + 1) * (2 * w / 5)) + ' ' + f(y); }
    return path(s + ' Z', sp.belly || c.light);
  }
  /* The goo creature changes shape as it grows: a cube, then a blob, then a big slime monster. */
  var GOO = [
    { hy: 132, hr: 40, er: [9, 11], ed: 18, ey: 0, top: 96 },
    { hy: 120, hr: 46, er: [10, 12], ed: 20, ey: 0, top: 78 },
    { hy: 96, hr: 50, er: [10, 12.5], ed: 22, ey: 0, top: 44 }
  ];
  function drawGoo(sp, st, c, mood, opts, id) {
    var fl = opts.flags || {}, g = assign({}, GOO[st]), hx = 100, s = '', o = { stroke: c.dark, 'stroke-width': 3, 'stroke-linejoin': 'round' };
    g.hy = g.hy; g.by = 170; g.brx = 50; g.bry = 20; g.foot = 10; g.scale = 1;
    var wide = fl.pudgy ? 1.18 : fl.thin ? 0.85 : 1, W = function (x) { return hx + (x - hx) * wide; };
    var body, drips = '', inner = '';
    if (st === 0) {
      body = P('M', W(58), 104, 'Q', W(58), 94, W(68), 94, 'L', W(132), 94, 'Q', W(142), 94, W(142), 104, 'L', W(142), 170, 'Q', W(142), 180, W(132), 180, 'L', W(68), 180, 'Q', W(58), 180, W(58), 170, 'Z');
      inner = path(P('M', W(58), 104, 'L', W(76), 84, 'L', W(152), 84, 'L', W(142), 94, 'L', W(68), 94, 'Q', W(58), 94, W(58), 104, 'Z'), mix(c.main, '#ffffff', 0.35), { opacity: 0.85, stroke: c.dark, 'stroke-width': 3, 'stroke-linejoin': 'round' }) +
        path(P('M', W(142), 94, 'L', W(152), 84, 'L', W(152), 162, 'L', W(142), 172, 'Z'), mix(c.main, c.dark, 0.3), { opacity: 0.85, stroke: c.dark, 'stroke-width': 3, 'stroke-linejoin': 'round' });
      drips = path(P('M', W(78), 180, 'q 4 10 0 14 q -4 -4 0 -14 M', W(118), 180, 'q 4 14 0 18 q -4 -4 0 -18'), c.main, o);
    } else if (st === 1) {
      body = P('M', W(46), 176, 'Q', W(40), 102, hx, 74, 'Q', W(160), 102, W(154), 176, 'Q', W(140), 184, W(128), 176, 'Q', W(114), 188, hx, 178, 'Q', W(86), 188, W(72), 176, 'Q', W(58), 184, W(46), 176, 'Z');
      drips = path(P('M', W(60), 150, 'q 3 10 0 14 q -3 -3 0 -14'), c.main, o);
    } else {
      [-1, 1].forEach(function (d) {
        var ax = hx + d * 50 * wide, arm = P('M', ax, 120, 'Q', hx + d * 86 * wide, 104, hx + d * 80 * wide, 60, 'Q', hx + d * 92 * wide, 52, hx + d * 94 * wide, 64, 'Q', hx + d * 100 * wide, 110, ax, 146, 'Z');
        s += path(arm, c.main, assign({ opacity: 0.92 }, o)) + path(P('M', hx + d * 88 * wide, 62, 'q 2 12 -1 16 q -3 -4 1 -16'), c.main, o);
        [-6, 4, 12].forEach(function (fx, i) { s += circle(hx + d * (86 + fx * 0.6) * wide, 56 - (i === 1 ? 6 : 0), 6, c.main, o); });
      });
      body = P('M', W(34), 180, 'Q', W(28), 110, W(54), 70, 'Q', W(66), 40, hx, 38, 'Q', W(134), 40, W(146), 70, 'Q', W(172), 110, W(166), 180, 'Q', W(150), 190, W(136), 180, 'Q', W(120), 194, hx, 182, 'Q', W(80), 194, W(64), 180, 'Q', W(48), 190, W(34), 180, 'Z');
      drips = path(P('M', W(62), 70, 'q 4 14 0 20 q -4 -4 0 -20 M', W(140), 78, 'q 4 12 0 17 q -4 -4 0 -17 M', hx, 38, 'q 5 -14 12 -8 q -6 2 -12 8'), c.main, o);
    }
    s += '<g class="cre-breathe">';
    s += path(body, c.main, assign({ opacity: 0.88 }, o));
    s += inner;
    /* things floating in the goo */
    var fk = st === 0 ? [[80, 160, 'coin'], [122, 150, 'bubble']] : st === 1 ? [[74, 150, 'coin'], [128, 146, 'bone'], [96, 164, 'bubble']] : [[62, 150, 'coin'], [138, 140, 'bone'], [84, 168, 'key'], [120, 166, 'bubble']];
    fk.forEach(function (q) {
      var x = W(q[0]), y = q[1];
      if (q[2] === 'coin') s += circle(x, y, 7, '#f2c14e', { stroke: '#a67c12', 'stroke-width': 1.5, opacity: 0.8 }) + path(P('M', x - 2, y - 3, 'l 0 6'), 'none', { stroke: '#a67c12', 'stroke-width': 1.5, opacity: 0.8 });
      else if (q[2] === 'bone') s += path(P('M', x - 9, y - 2, 'L', x + 9, y + 2), 'none', { stroke: '#f4efe4', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.8 }) + circle(x - 10, y - 4, 3, '#f4efe4', { opacity: 0.8 }) + circle(x - 10, y, 3, '#f4efe4', { opacity: 0.8 }) + circle(x + 10, y, 3, '#f4efe4', { opacity: 0.8 }) + circle(x + 10, y + 4, 3, '#f4efe4', { opacity: 0.8 });
      else if (q[2] === 'key') s += circle(x - 7, y, 4, 'none', { stroke: '#c8a44c', 'stroke-width': 2.2, opacity: 0.85 }) + path(P('M', x - 3, y, 'L', x + 9, y, 'M', x + 6, y, 'l 0 4 M', x + 9, y, 'l 0 4'), 'none', { stroke: '#c8a44c', 'stroke-width': 2.2, opacity: 0.85 });
      else s += circle(x, y, 5, '#fff', { opacity: 0.35 }) + circle(x + 9, y - 10, 3, '#fff', { opacity: 0.35 });
    });
    s += drips;
    s += path(P('M', W(62) + (st === 0 ? 4 : 0), st === 0 ? 116 : st === 1 ? 110 : 84, 'Q', W(66), st === 0 ? 102 : st === 1 ? 92 : 62, W(84), st === 0 ? 100 : st === 1 ? 84 : 52), 'none', { stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.55 });
    s += circle(W(70), st === 0 ? 128 : st === 1 ? 124 : 100, 3, '#fff', { opacity: 0.6 });
    if (!fl.thin && !fl.dirty) [-1, 1].forEach(function (d) { s += ellipse(hx + d * g.hr * 0.66, g.hy + g.hr * 0.3, g.hr * 0.16, g.hr * 0.1, '#ff8fa3', { opacity: 0.5 }); });
    var calm = mood === 'ok' || mood === 'happy';
    var eyeMood = fl.tired && calm ? 'lazy' : mood;
    if (opts.blink && eyeMood !== 'asleep' && eyeMood !== 'eat') eyeMood = 'asleep';
    s += mouth(sp, g, c, hx, (fl.pudgy || fl.thin || fl.dirty) && calm ? 'grubby' : mood);
    if (st === 2) s += '<g class="cre-eyes">' + eyes(0, assign(assign({}, g), { hy: g.hy - 30, ed: 0, er: [7, 8.5] }), c, hx, eyeMood === 'happy' ? 'ok' : eyeMood, sp).replace(/<[^>]*d="M[^"]*"[^>]*stroke-width="3"[^>]*\/>/g, '') + '</g>';
    s += '<g class="cre-eyes">' + eyes(st === 2 ? 1 : st, g, c, hx, eyeMood, sp) + '</g>';
    if (fl.tired && mood !== 'asleep') [-1, 1].forEach(function (d) { var ex = hx + d * g.ed, ey = g.hy + g.ey + g.er[1] + 2; s += path(P('M', ex - g.er[0], ey, 'Q', ex, ey + 7, ex + g.er[0], ey), 'none', { stroke: '#7b5aa6', 'stroke-width': 2.5, opacity: 0.75, 'stroke-linecap': 'round' }); });
    if (opts.acc) s += accessory(opts.acc, assign(assign({}, g), { hy: g.top + g.hr * 0.95 }), hx, c);
    s += moodFx(g, hx, mood === 'grubby' ? 'ok' : mood);
    if (fl.dirty) s += dirtFx(g, hx, 160);
    s += '</g>';
    var out = '<defs><filter id="' + id + 'd"><feColorMatrix type="saturate" values="0.3"/></filter><radialGradient id="' + id + 'g"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>' +
      ellipse(100, 186, 58 * wide, 9, 'url(#' + id + 'g)') + '<g' + (fl.thin ? ' filter="url(#' + id + 'd)"' : '') + '>' + s + '</g>';
    if (fl.dirty && !opts.noStink) out += stink();
    return '<svg viewBox="-6 -34 212 234" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + sp.names[st] + '" class="cre">' + out + '</svg>';
  }
  /* Object creatures (rock, ice, fire) change what they are at each stage. */
  function flamePath(cx, by, w, h) {
    return P('M', cx - w * 0.5, by - h * 0.12, 'C', cx - w * 0.64, by - h * 0.5, cx - w * 0.3, by - h * 0.6, cx - w * 0.3, by - h * 0.86,
      'C', cx - w * 0.12, by - h * 0.72, cx - w * 0.08, by - h * 0.8, cx + w * 0.03, by - h, 'C', cx + w * 0.14, by - h * 0.78, cx + w * 0.3, by - h * 0.78, cx + w * 0.3, by - h * 0.6,
      'C', cx + w * 0.44, by - h * 0.68, cx + w * 0.64, by - h * 0.42, cx + w * 0.5, by - h * 0.12, 'Q', cx + w * 0.4, by + h * 0.03, cx, by + h * 0.03, 'Q', cx - w * 0.4, by + h * 0.03, cx - w * 0.5, by - h * 0.12, 'Z');
  }
  function poly(pts, fill, extra) { return path('M' + pts.map(function (q) { return f(q[0]) + ' ' + f(q[1]); }).join(' L') + ' Z', fill, extra); }
  function drawShape(sp, st, c, mood, opts, id) {
    var fl = opts.flags || {}, hx = 100, s = '', o = { stroke: c.dark, 'stroke-width': 3, 'stroke-linejoin': 'round' }, wide = fl.pudgy ? 1.15 : fl.thin ? 0.86 : 1;
    function Wp(pts) { return pts.map(function (q) { return [hx + (q[0] - hx) * wide, q[1]]; }); }
    var g, top, ground = 50, flick = opts.tailRot ? opts.tailRot * 0.6 : 0, shade = mix(c.main, c.dark, 0.32), hi = mix(c.main, '#ffffff', 0.35);
    if (sp.shape === 'rock') {
      if (st === 0) {
        s += ellipse(hx, 160, 42 * wide, 26, c.main, o) + ellipse(hx + 14, 168, 24 * wide, 14, shade, { opacity: 0.45 }) + path(P('M', hx - 26, 150, 'Q', hx - 16, 138, hx, 137), 'none', { stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5 });
        s += path(P('M', hx - 6, 136, 'q -6 -8 -2 -12 q 4 4 2 12 M', hx + 2, 136, 'q 4 -10 10 -10 q -2 6 -10 10'), '#6fae4f', { stroke: '#3f7a2f', 'stroke-width': 1.5 });
        g = { hy: 156, hr: 30, er: [7, 8.5], ed: 14, ey: 0 }; top = 134; ground = 44;
      } else if (st === 1) {
        [-1, 1].forEach(function (d) { s += poly(Wp([[hx + d * 52, 138], [hx + d * 70, 146], [hx + d * 68, 162], [hx + d * 52, 164]]), c.main, o); });
        var pts = Wp([[52, 180], [46, 140], [64, 108], [98, 96], [136, 106], [154, 140], [148, 180]]);
        s += poly(pts, c.main, o) + poly(Wp([[136, 106], [154, 140], [148, 180], [118, 180], [124, 130]]), shade, { opacity: 0.55 }) + poly(Wp([[64, 108], [98, 96], [104, 104], [72, 118]]), hi, { opacity: 0.7 });
        s += path(P('M', hx + 20, 112, 'l -6 12 l 6 6 l -4 10'), 'none', { stroke: c.dark, 'stroke-width': 2, opacity: 0.6, 'stroke-linecap': 'round' });
        s += path(P('M', hx - 12, 97, 'q -4 -10 2 -12 q 2 6 -2 12 M', hx - 4, 97, 'q 6 -10 12 -8 q -4 6 -12 8'), '#6fae4f', { stroke: '#3f7a2f', 'stroke-width': 1.5 });
        g = { hy: 140, hr: 38, er: [8.5, 10], ed: 18, ey: 0 }; top = 98; ground = 54;
      } else {
        [-1, 1].forEach(function (d) { s += poly(Wp([[hx + d * 66, 112], [hx + d * 94, 98], [hx + d * 104, 122], [hx + d * 96, 146], [hx + d * 70, 146]]), c.main, o) + poly(Wp([[hx + d * 96, 146], [hx + d * 104, 122], [hx + d * 92, 128]]), shade, { opacity: 0.5 }); });
        var bp = Wp([[30, 182], [24, 130], [44, 86], [80, 62], [124, 60], [160, 84], [176, 130], [170, 182]]);
        s += poly(bp, c.main, o) + poly(Wp([[160, 84], [176, 130], [170, 182], [138, 182], [146, 120]]), shade, { opacity: 0.55 }) + poly(Wp([[44, 86], [80, 62], [92, 72], [56, 98]]), hi, { opacity: 0.7 });
        s += path(P('M', hx - 44, 124, 'l 10 8 l -4 10 l 8 6 M', hx + 30, 150, 'l 8 -8 l 10 2'), 'none', { stroke: c.dark, 'stroke-width': 2.2, opacity: 0.6, 'stroke-linecap': 'round' });
        [[hx - 30, 64, 16], [hx + 6, 58, 20], [hx + 36, 66, 14]].forEach(function (m) { s += ellipse(m[0], m[1], m[2], 8, '#6fae4f', { stroke: '#3f7a2f', 'stroke-width': 2 }); });
        [[hx + 56, 104, -20], [hx + 64, 114, 10], [hx - 60, 160, -30]].forEach(function (q) { s += '<g transform="rotate(' + q[2] + ' ' + f(q[0]) + ' ' + f(q[1]) + ')">' + poly([[q[0] - 5, q[1]], [q[0], q[1] - 16], [q[0] + 5, q[1]], [q[0], q[1] + 4]], c.accent, { stroke: c.dark, 'stroke-width': 1.5 }) + '</g>'; });
        g = { hy: 118, hr: 46, er: [9.5, 11.5], ed: 22, ey: 0 }; top = 62; ground = 76;
      }
    } else if (sp.shape === 'ice') {
      var ice = { opacity: 0.9 }, frost = '#ffffff';
      if (st === 0) {
        s += ellipse(hx, 184, 44, 5, c.main, { opacity: 0.5 });
        s += path(P('M', hx - 42, 106, 'L', hx - 26, 90, 'L', hx + 52, 90, 'L', hx + 42, 106, 'Z'), hi, assign({ stroke: c.dark, 'stroke-width': 3, 'stroke-linejoin': 'round' }, ice));
        s += path(P('M', hx + 42, 106, 'L', hx + 52, 90, 'L', hx + 52, 166, 'L', hx + 42, 180, 'Z'), shade, assign({ stroke: c.dark, 'stroke-width': 3, 'stroke-linejoin': 'round' }, ice));
        s += el('rect', { x: hx - 42, y: 106, width: 84, height: 74, rx: 6, fill: c.main, stroke: c.dark, 'stroke-width': 3, opacity: 0.92 });
        s += path(P('M', hx - 34, 118, 'L', hx - 34, 140, 'M', hx - 28, 114, 'L', hx - 12, 114), 'none', { stroke: frost, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.8 });
        s += path(P('M', hx - 42, 176, 'q 10 -8 20 0 q 10 -8 20 0 q 10 -8 20 0 q 10 -8 22 0'), 'none', { stroke: frost, 'stroke-width': 3, opacity: 0.7 });
        [[hx + 30, 120], [hx - 20, 170]].forEach(function (q) { s += path(starPath(q[0], q[1], 5, 2), frost, { opacity: 0.9 }); });
        g = { hy: 142, hr: 38, er: [8.5, 10.5], ed: 17, ey: 0 }; top = 92; ground = 46;
      } else if (st === 1) {
        s += poly([[hx - 30, 124], [hx + 30, 124], [hx, 186]], '#f4f1ea', { stroke: '#a8a090', 'stroke-width': 3, 'stroke-linejoin': 'round' });
        [[-18, 0], [-4, 0], [10, 0]].forEach(function (q, i) { s += path(P('M', hx + q[0], 124, 'L', hx + q[0] * 0.3 + 3, 180), 'none', { stroke: c.accent, 'stroke-width': 4, opacity: 0.55 }); });
        var sc = P('M', hx - 44, 128, 'Q', hx - 52, 96, hx - 30, 80, 'Q', hx - 22, 58, hx, 58, 'Q', hx + 22, 58, hx + 30, 80, 'Q', hx + 52, 96, hx + 44, 128, 'Q', hx + 30, 136, hx + 16, 128, 'Q', hx, 136, hx - 16, 128, 'Q', hx - 30, 136, hx - 44, 128, 'Z');
        s += path(sc, c.light, o);
        s += path(P('M', hx - 34, 84, 'Q', hx - 20, 60, hx, 60, 'Q', hx + 24, 60, hx + 36, 86, 'Q', hx + 30, 96, hx + 24, 90, 'Q', hx + 20, 104, hx + 12, 94, 'Q', hx, 102, hx - 10, 92, 'Q', hx - 18, 102, hx - 24, 90, 'Q', hx - 30, 96, hx - 34, 84, 'Z'), c.accent, { opacity: 0.85 });
        [[-30, 108], [-10, 118], [18, 112], [34, 104], [0, 104], [-20, 96]].forEach(function (q) { s += circle(hx + q[0], q[1], 2.2, '#fff', { opacity: 0.9 }); });
        s += path(P('M', hx + 28, 88, 'q 3 10 0 14 q -3 -3 0 -14'), c.accent, { opacity: 0.85 });
        g = { hy: 106, hr: 38, er: [8.5, 10.5], ed: 17, ey: 0 }; top = 60; ground = 34;
      } else {
        var ip = [[24, 176], [40, 120], [62, 100], [80, 52], [100, 34], [118, 60], [140, 72], [162, 120], [178, 176]];
        s += poly(ip, c.main, assign({ stroke: c.dark, 'stroke-width': 3, 'stroke-linejoin': 'round' }, ice));
        s += poly([[100, 34], [118, 60], [140, 72], [162, 120], [178, 176], [128, 176], [124, 96]], shade, { opacity: 0.45 });
        s += poly([[62, 100], [80, 52], [100, 34], [92, 70], [72, 110]], '#ffffff', { opacity: 0.45 });
        s += path(P('M', 70, 82, 'L', 80, 52, 'L', 100, 34, 'L', 118, 60, 'L', 130, 66, 'Q', 122, 76, 112, 70, 'Q', 104, 82, 96, 72, 'Q', 88, 84, 80, 76, 'Q', 76, 88, 70, 82, 'Z'), '#ffffff', { stroke: c.dark, 'stroke-width': 2, 'stroke-linejoin': 'round' });
        [[52, 112], [148, 104]].forEach(function (q) { s += poly([[q[0] - 4, q[1]], [q[0] + 4, q[1]], [q[0], q[1] + 14]], '#ffffff', { stroke: c.dark, 'stroke-width': 1.5, opacity: 0.9 }); });
        s += el('rect', { x: 8, y: 170, width: 184, height: 18, rx: 9, fill: '#4a9ad8', opacity: 0.85 }) + path(P('M', 12, 172, 'q 12 -6 24 0 q 12 -6 24 0 q 12 -6 24 0 q 12 -6 24 0 q 12 -6 24 0 q 12 -6 24 0 q 12 -6 24 0'), 'none', { stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round' });
        [[140, 90], [60, 150]].forEach(function (q) { s += path(starPath(q[0], q[1], 5, 2), '#fff'); });
        g = { hy: 124, hr: 44, er: [9.5, 11.5], ed: 20, ey: 0 }; top = 40; ground = 0;
      }
    } else if (sp.shape === 'cake') {   /* flat fallback for the cupcake cat: cupcake, layer cake, party cake, with a frosting cat head */
      var hy0 = [118, 92, 72][st], hr0 = [34, 32, 30][st], cs = { stroke: c.dark, 'stroke-width': 2.5, 'stroke-linejoin': 'round' };
      if (st === 0) {
        s += poly(Wp([[hx - 30, 186], [hx + 30, 186], [hx + 40, 140], [hx - 40, 140]]), c.accent, cs);
        for (var pl = -3; pl <= 3; pl++) s += path(P('M', hx + pl * 10, 142, 'L', hx + pl * 8, 184), 'none', { stroke: c.dark, 'stroke-width': 1.5, opacity: 0.35 });
        s += ellipse(hx, 140, 44 * wide, 12, c.main, cs);
      } else {
        var tiers = st === 1 ? [[186, 58, 60]] : [[186, 72, 44], [142, 52, 40]];
        tiers.forEach(function (tr) {
          s += el('rect', { x: hx - tr[1] * wide, y: tr[0] - tr[2], width: tr[1] * 2 * wide, height: tr[2], rx: 6, fill: c.light, stroke: c.dark, 'stroke-width': 2.5 });
          s += el('rect', { x: hx - tr[1] * wide, y: tr[0] - tr[2] * 0.55, width: tr[1] * 2 * wide, height: 7, fill: c.main });
          s += path(P('M', hx - tr[1] * wide, tr[0] - tr[2] + 4, 'q 8 12 14 0 q 8 14 16 0 q 8 10 14 0 q 8 14 16 0 q 8 12 14 0 q 8 14 16 0 q 6 10 12 0'), c.main, { stroke: c.dark, 'stroke-width': 1.5 });
        });
        if (st === 2) [-50, -24, 24, 50].forEach(function (dx) { s += el('rect', { x: hx + dx - 3, y: 120, width: 6, height: 18, fill: '#f6f3ec', stroke: c.dark, 'stroke-width': 1.2 }) + path(flamePath(hx + dx, 118, 9, 14), '#ffcf3f'); });
      }
      [-1, 1].forEach(function (d) { s += poly([[hx + d * hr0 * 0.75, hy0 - hr0 * 0.55], [hx + d * hr0 * 0.95, hy0 - hr0 * 1.25], [hx + d * hr0 * 0.25, hy0 - hr0 * 0.85]], c.main, cs); });
      s += ellipse(hx, hy0, hr0 * 1.12 * wide, hr0, c.main, cs) + volume(id, hx, hy0, hr0 * 1.12, hr0);
      [[-14, -18, '#ff5a6e'], [10, -22, '#5ac8f2'], [20, -6, '#ffd23f'], [-22, -4, '#8fe36a']].forEach(function (q) { s += el('rect', { x: hx + q[0], y: hy0 + q[1], width: 6, height: 2.5, rx: 1.2, fill: q[2], transform: 'rotate(' + (q[0] * 2) + ' ' + f(hx + q[0]) + ' ' + f(hy0 + q[1]) + ')' }); });
      s += circle(hx + 2, hy0 - hr0 - 6, 7, '#e2283c', { stroke: '#8a1420', 'stroke-width': 1.5 }) + path(P('M', hx + 3, hy0 - hr0 - 12, 'q 2 -6 7 -9'), 'none', { stroke: '#5a8a2a', 'stroke-width': 2 });
      g = { hy: hy0 + 4, hr: hr0, er: [7, 8.5], ed: 13, ey: 0 }; top = hy0 - hr0 - 14; ground = 14;
    } else {
      var head = mix(c.main, c.dark, 0.25);
      function fire(cx, by, w, h) {
        var t = flick ? ' transform="rotate(' + flick + ' ' + f(cx) + ' ' + f(by) + ')"' : '';
        return '<g class="cre-flicker"' + t + '>' + path(flamePath(cx, by, w, h), c.main, o) + path(flamePath(cx, by - 2, w * 0.66, h * 0.72), c.accent) + path(flamePath(cx, by - 4, w * 0.3, h * 0.38), '#fffbe6', { opacity: 0.9 }) + '</g>';
      }
      if (st === 0) {
        s += el('rect', { x: hx - 7, y: 116, width: 14, height: 68, rx: 3, fill: '#e8c88a', stroke: '#a8844a', 'stroke-width': 3 }) + path(P('M', hx - 2, 124, 'L', hx - 2, 176), 'none', { stroke: '#fff', 'stroke-width': 2, opacity: 0.5 });
        s += fire(hx, 84, 30, 44);
        s += ellipse(hx, 106, 26, 26, head, o) + volume(id, hx, 106, 26, 26);
        g = { hy: 106, hr: 24, er: [6.5, 8], ed: 10, ey: -1 }; top = 60; ground = 16;
      } else if (st === 1) {
        s += path(P('M', hx - 12, 128, 'L', hx + 12, 128, 'L', hx + 8, 184, 'L', hx - 8, 184, 'Z'), '#b07d4f', { stroke: '#6b4a2a', 'stroke-width': 3, 'stroke-linejoin': 'round' });
        s += path(P('M', hx - 10, 150, 'L', hx + 10, 150, 'M', hx - 9, 166, 'L', hx + 9, 166), 'none', { stroke: '#6b4a2a', 'stroke-width': 3 });
        s += ellipse(hx, 124, 30, 13, '#c8a878', { stroke: '#7a5a34', 'stroke-width': 3 }) + path(P('M', hx - 24, 120, 'L', hx + 24, 128, 'M', hx - 26, 128, 'L', hx + 22, 120), 'none', { stroke: '#7a5a34', 'stroke-width': 2 });
        s += fire(hx, 122, 72, 96);
        g = { hy: 88, hr: 30, er: [7.5, 9.5], ed: 13, ey: 0 }; top = 36; ground = 26;
      } else {
        [[40, 178], [66, 184], [100, 186], [134, 184], [160, 178]].forEach(function (q) { s += ellipse(q[0], q[1], 16, 9, '#9a9189', { stroke: '#5a524c', 'stroke-width': 2.5 }); });
        [[-16, 20], [16, -20]].forEach(function (q) { s += '<g transform="rotate(' + q[1] + ' ' + hx + ' 168)">' + el('rect', { x: hx - 50, y: 160, width: 100, height: 16, rx: 8, fill: '#8a5a2b', stroke: '#4a2e14', 'stroke-width': 3 }) + circle(hx + 44, 168, 5, '#e8c88a', { stroke: '#4a2e14', 'stroke-width': 1.5 }) + '</g>'; });
        s += fire(hx, 168, 130, 156);
        [-1, 1].forEach(function (d) { var ax = hx + d * 66; s += '<g class="cre-flicker" transform="rotate(' + (d * 28) + ' ' + ax + ' 140)">' + path(flamePath(ax, 140, 26, 50), c.main, o) + path(flamePath(ax, 138, 14, 30), c.accent) + '</g>'; });
        [[40, 40], [160, 30], [150, 70], [52, 90]].forEach(function (q, i) { s += circle(q[0], q[1] - (opts.tailRot ? (i % 2 ? 4 : -4) : 0), 3, c.accent, { opacity: 0.85 }); });
        g = { hy: 104, hr: 42, er: [9.5, 11.5], ed: 19, ey: 0 }; top = 20; ground = 70;
      }
    }
    var calm = mood === 'ok' || mood === 'happy';
    var eyeMood = fl.tired && calm ? 'lazy' : mood;
    if (opts.blink && eyeMood !== 'asleep' && eyeMood !== 'eat') eyeMood = 'asleep';
    var face = '';
    if (!fl.thin && !fl.dirty) [-1, 1].forEach(function (d) { face += ellipse(hx + d * g.hr * 0.66, g.hy + g.hr * 0.3, g.hr * 0.16, g.hr * 0.1, '#ff8fa3', { opacity: 0.55 }); });
    face += mouth(sp, g, c, hx, (fl.pudgy || fl.thin || fl.dirty) && calm ? 'grubby' : mood);
    face += '<g class="cre-eyes">' + eyes(st === 2 ? 1 : st, g, c, hx, eyeMood, sp) + '</g>';
    if (fl.tired && mood !== 'asleep') [-1, 1].forEach(function (d) { var ex = hx + d * g.ed, ey = g.hy + g.ey + g.er[1] + 2; face += path(P('M', ex - g.er[0], ey, 'Q', ex, ey + 7, ex + g.er[0], ey), 'none', { stroke: '#7b5aa6', 'stroke-width': 2.5, opacity: 0.75, 'stroke-linecap': 'round' }); });
    if (opts.acc) face += accessory(opts.acc, assign(assign({}, g), { hy: top + g.hr * 0.95 }), hx, c);
    face += moodFx(g, hx, mood === 'grubby' ? 'ok' : mood);
    if (fl.dirty) face += dirtFx(g, hx, 160);
    var out = '<defs><filter id="' + id + 'd"><feColorMatrix type="saturate" values="0.3"/></filter>' +
      '<radialGradient id="' + id + 'v" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></radialGradient>' +
      '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>' +
      (ground ? ellipse(100, 187, ground * wide, 8, 'url(#' + id + 'g)') : '') +
      '<g' + (fl.thin ? ' filter="url(#' + id + 'd)"' : '') + '><g class="cre-breathe">' + s + face + '</g></g>';
    if (fl.dirty && !opts.noStink) out += stink();
    return '<svg viewBox="-6 -34 212 234" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + sp.names[st] + '" class="cre">' + out + '</svg>';
  }
  /* ---------- 3D bodies (c3d.js): the body is a pre-rendered sprite, the face is drawn live at its anchors ---------- */
  var U3 = 66;
  function draw3d(sp, st, c, mood, opts, s3, view) {
    var fl = opts.flags || {}, a = s3.a, m = s3.m, T = s3.T, id = 'cr' + (++UID);
    var gx = a.ground[0], gy = a.ground[1];
    var bb = a.bb || [0, 0, T, T];
    var k = Math.min(U3 * m.span / T, 104 / Math.max(gx - bb[0], 1), 104 / Math.max(bb[2] - gx, 1), 218 / Math.max(gy - bb[1], 1));
    function X(px) { return 100 + (px - gx) * k; }
    function Y(py) { return 186 + (py - gy) * k; }
    var hr = a.head[2] * k, hx = X(a.head[0]), hy = Y(a.head[1]), er = [m.er[0] * hr, m.er[1] * hr];
    var calm = mood === 'ok' || mood === 'happy';
    var eyeMood = fl.tired && calm ? 'lazy' : (fl.pudgy && mood === 'happy' ? 'ok' : mood);
    if (opts.blink && eyeMood !== 'asleep' && eyeMood !== 'eat') eyeMood = 'asleep';
    var mouthMood = (fl.pudgy || fl.thin || fl.dirty) && calm ? 'grubby' : mood;
    var bw = fl.pudgy ? 1.14 : fl.thin ? 0.88 : 1, f2 = sp.face || [], back = view === 'back';
    var s = '<defs><radialGradient id="' + id + 'g"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
      (fl.thin ? '<filter id="' + id + 'd"><feColorMatrix type="saturate" values="0.4"/></filter>' : '') + '</defs>';
    s += ellipse(100, 186, 50 * bw * Math.min(1.3, m.span / 2.6), 8.5, 'url(#' + id + 'g)');
    s += '<g' + (opts.flip ? ' transform="translate(200 0) scale(-1 1)"' : '') + '><g class="cre-breathe"><g' + (bw !== 1 ? ' transform="translate(100 0) scale(' + bw + ' 1) translate(-100 0)"' : '') + '>';
    s += '<image x="' + f(X(0)) + '" y="' + f(Y(0)) + '" width="' + f(T * k) + '" height="' + f(T * k) + '" preserveAspectRatio="none" xlink:href="' + s3.url + '"' + (fl.thin ? ' filter="url(#' + id + 'd)"' : '') + '/>';
    if (fl.belly && !back) {   /* skinnyfat: a soft little pot belly under the head, in the body colour */
      var hb = a.head[1] + a.head[2] * 0.92, gy0 = a.ground[1], bxp = a.head[0] + (view === 'side' ? -a.head[2] * 0.28 : view === 'three' ? -a.head[2] * 0.08 : 0);
      var byp = hb + Math.max(8, (gy0 - hb) * 0.5), brx = a.head[2] * 0.5 * k / bw, bry = a.head[2] * 0.44 * k;
      s += '<defs><radialGradient id="' + id + 'b" cx="40%" cy="30%" r="72%"><stop offset="0" stop-color="' + c.light + '"/><stop offset=".5" stop-color="' + c.main + '"/><stop offset="1" stop-color="' + c.dark + '"/></radialGradient>' +
        '<radialGradient id="' + id + 'bs"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>' +
        '<g' + (fl.thin ? ' filter="url(#' + id + 'd)"' : '') + '>' + ellipse(X(bxp), Y(byp) + bry * 0.75, brx * 0.9, bry * 0.35, 'url(#' + id + 'bs)') + ellipse(X(bxp), Y(byp), brx, bry, 'url(#' + id + 'b)') +
        path(P('M', X(bxp) - brx * 0.14, Y(byp) + bry * 0.2, 'Q', X(bxp), Y(byp) + bry * 0.32, X(bxp) + brx * 0.12, Y(byp) + bry * 0.18), 'none', { stroke: c.dark, 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.45 }) + '</g>';
    }
    function A(n) {
      var v = a[n]; if (!v || !v[4]) return null;
      var sx = 0.38 + 0.62 * v[2], x = X(v[0]);
      if (n.charAt(0) === 'e' && v[2] < 0.8) x += (hx - x) * 0.3 * (1 - v[2]);   /* side-on eyes sit a little further back on the head */
      return { x: x, y: Y(v[1]), sx: sx, sy: v[3], d: v[5] < 0 ? -1 : 1 };
    }
    function squash(p, inner) { return '<g transform="translate(' + f(p.x) + ' ' + f(p.y) + ') scale(' + f(p.sx) + ' ' + f(p.sy) + ') translate(' + f(-p.x) + ' ' + f(-p.y) + ')">' + inner + '</g>'; }
    var e0 = A('eye0'), e1 = A('eye1'), ch0 = A('cheek0'), ch1 = A('cheek1'), mo = A('mouth'), fo = A('fore'), eyesL = [e0, e1].filter(function (e) { return e; });
    var face = '';
    if (f2.indexOf('patch') >= 0 && e1) face += squash(e1, ellipse(e1.x, e1.y, er[0] * 2.1, er[1] * 1.75, c.dark));
    if (f2.indexOf('forehead') >= 0 && fo) face += squash(fo, [-1, 0, 1].map(function (q) { return path(P('M', fo.x + q * hr * 0.18, fo.y - hr * 0.12, 'L', fo.x + q * hr * 0.15, fo.y + hr * 0.14), 'none', { stroke: c.dark, 'stroke-width': 3.2, 'stroke-linecap': 'round' }); }).join(''));
    if (!fl.thin && !fl.dirty) [ch0, ch1].forEach(function (p) { if (p) face += squash(p, ellipse(p.x, p.y, hr * 0.17, hr * 0.11, '#ff8fa3', { opacity: 0.5 }) + circle(p.x + hr * 0.04, p.y - hr * 0.03, 1.6, '#fff', { opacity: 0.7 })); });
    if (f2.indexOf('whiskers') >= 0) [ch0, ch1].forEach(function (p) { if (p) [-4, 2, 8].forEach(function (dy) { face += path(P('M', p.x + p.d * hr * 0.05, p.y + dy * 0.35 - 3, 'L', p.x + p.d * hr * 0.5 * p.sx, p.y - hr * 0.08 + dy - 3), 'none', { stroke: c.dark, 'stroke-width': 1.7, 'stroke-linecap': 'round', opacity: 0.7 }); }); });
    if (mo) {
      var mz = sp.muzzle, mk = hr / 41, mm = '';
      if (mz === true || mz === 'snout') {
        var my = mo.y, mx = mo.x;
        if (mouthMood === 'hungry' || mouthMood === 'eat') mm += ellipse(mx, my + 3 * mk, 4.5 * mk, (mouthMood === 'eat' ? 6 : 4) * mk, '#7a2a3a');
        else if (mouthMood === 'grubby' || mouthMood === 'lazy' || mouthMood === 'sleepy') mm += path(P('M', mx - 5 * mk, my + 3 * mk, 'Q', mx, my - 0.5 * mk, mx + 5 * mk, my + 3 * mk), 'none', { stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' });
        else {
          if (mouthMood === 'happy') mm += path(P('M', mx - 3 * mk, my + 2 * mk, 'Q', mx, my + 11 * mk, mx + 3 * mk, my + 2 * mk, 'Z'), '#f47a8a', { stroke: '#b8455a', 'stroke-width': 1.2 });
          mm += path(P('M', mx, my - 4 * mk, 'L', mx, my, 'M', mx - 7 * mk, my, 'Q', mx - 3.5 * mk, my + (mouthMood === 'happy' ? 7 : 4) * mk, mx, my, 'Q', mx + 3.5 * mk, my + (mouthMood === 'happy' ? 7 : 4) * mk, mx + 7 * mk, my), 'none', { stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        }
        if (sp.fangs && st > 0 && mouthMood !== 'hungry' && mouthMood !== 'eat') [-1, 1].forEach(function (d) { mm += path(P('M', mx + d * 3 * mk, my + 1, 'L', mx + d * 5.5 * mk, my + 7 * mk, 'L', mx + d * 8 * mk, my + 0.5, 'Z'), '#fff', { stroke: c.dark, 'stroke-width': 1 }); });
      } else if (mz !== 'beak') {
        mm += mouth(sp, { hy: mo.y - hr * 0.42, hr: hr }, c, mo.x, mouthMood);
        if (sp.fangs && st > 0 && mouthMood !== 'hungry' && mouthMood !== 'eat') [-1, 1].forEach(function (d) { mm += path(P('M', mo.x + d * 3, mo.y + 1, 'L', mo.x + d * 5.5, mo.y + 7, 'L', mo.x + d * 8, mo.y + 0.5, 'Z'), '#fff', { stroke: c.dark, 'stroke-width': 1 }); });
      }
      if (mm) face += squash({ x: mo.x, y: mo.y, sx: mo.sx, sy: 1 }, mm);
    }
    var eyeSvg = '';
    eyesL.forEach(function (e) {
      eyeSvg += squash(e, eyes(st, { hy: e.y, ey: 0, ed: 0, er: er }, c, e.x, eyeMood, sp, [e.d]));
      if (f2.indexOf('kohl') >= 0 && eyeMood !== 'asleep' && eyeMood !== 'happy' && eyeMood !== 'eat') eyeSvg += path(P('M', e.x + e.d * er[0] * 0.8 * e.sx, e.y - 1, 'l', e.d * 8 * e.sx, -4), 'none', { stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
      if (f2.indexOf('tears') >= 0) eyeSvg += path(P('M', e.x - e.d * er[0] * 0.3, e.y + er[1], 'Q', e.x - e.d * er[0] * 0.5, e.y + er[1] * 2, e.x - e.d * er[0] * 1.2, e.y + er[1] * 2.6), 'none', { stroke: INK, 'stroke-width': 2.3, 'stroke-linecap': 'round' });
      if (fl.tired && mood !== 'asleep') eyeSvg += path(P('M', e.x - er[0] * e.sx, e.y + er[1] + 2, 'Q', e.x, e.y + er[1] + 9, e.x + er[0] * e.sx, e.y + er[1] + 2), 'none', { stroke: '#7b5aa6', 'stroke-width': 2.5, opacity: 0.75, 'stroke-linecap': 'round' });
      if ((fl.pudgy || fl.dirty) && calm && !fl.tired) eyeSvg += path(P('M', e.x - e.d * er[0] * 1.2 * e.sx, e.y - er[1] - 1, 'L', e.x + e.d * er[0] * 0.9 * e.sx, e.y - er[1] - 6), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
    });
    if (sp.crest === 'bangs' && eyesL.length) {
      var cy = Math.min.apply(null, eyesL.map(function (e) { return e.y; }));
      s += '<defs><clipPath id="' + id + 'c"><rect x="-10" y="' + f(cy - er[1] * 0.1) + '" width="230" height="240"/></clipPath></defs>';
      eyeSvg = '<g clip-path="url(#' + id + 'c)">' + eyeSvg + '</g>';
    }
    face += '<g class="cre-eyes">' + eyeSvg + '</g>';
    s += face;
    var gA = { hy: hy, hr: hr, er: er, ey: eyesL.length ? eyesL[0].y - hy : hr * 0.1, ed: e0 && e1 ? Math.abs(e1.x - e0.x) / 2 : hr * 0.4, by: Y(gy) - hr * 0.7 };
    if (opts.acc) {
      var hats = { strawhat: 1, sailor: 1, captain: 1, crown: 1 };
      if (hats[opts.acc]) s += accessory(opts.acc, gA, X(a.top ? a.top[0] : a.head[0]), c);
      else if (!back && view !== 'side' || opts.acc === 'lei') s += accessory(opts.acc, gA, opts.acc === 'sunglasses' && e0 && e1 ? (e0.x + e1.x) / 2 : hx, c);
    }
    s += moodFx(gA, hx, mood === 'grubby' ? 'ok' : mood);
    if (fl.dirty) s += dirtFx(gA, hx, gA.by);
    s += '</g></g></g>';
    if (fl.dirty && !opts.noStink) s += stink();
    if (sp.rare || opts.glow) s = '<g opacity=".85">' + path(starPath(18, 20, 7, 3), '#ffe27a') + path(starPath(186, 50, 5, 2), '#ffe27a') + path(starPath(170, 150, 4, 1.8), '#ffe27a') + '</g>' + s;
    if (opts.shine) s += path('M30 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z', '#ffe27a') + path('M168 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z', '#ffe27a');
    return '<svg viewBox="-6 -34 212 234" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="' + sp.names[st] + '" class="cre cre3d">' + s + '</svg>';
  }
  function waiting3d(sp, st) {
    return '<svg viewBox="-6 -34 212 234" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + sp.names[st] + '" class="cre cre-wait">' + ellipse(100, 186, 46, 8, '#000', { opacity: 0.12 }) +
      circle(100, 130, 34, '#fff', { opacity: 0.35 }) + '</svg>';
  }
  function draw(spId, st, pi, mood, opts) {
    opts = opts || {};
    var fl = opts.flags || {};
    var sp = byId(spId) || SPECIES[0];
    st = Math.max(0, Math.min(2, st || 0));
    var c = opts.pal || sp.palettes[pi] || sp.palettes[0];
    if (window.C3D && !C3D.off && !opts.flat && C3D.has(sp.id)) {
      var s3 = (opts.frame != null && opts.view ? C3D.sprite(sp.id, st, c, opts.view, opts.frame) : null) || C3D.sprite(sp.id, st, c, opts.view || 'three');
      if (s3) return draw3d(sp, st, c, mood || 'ok', opts, s3, opts.view || 'three');
      if (!C3D.ready(sp.id)) return waiting3d(sp, st);
    }
    var g = sp.blob ? BLOB[st] : GEO[st], hx = 100, bx = 100, o = outline(c.dark);
    var id = 'cr' + (++UID);
    if (sp.goo) return drawGoo(sp, st, c, mood || 'ok', opts, id);
    if (sp.shape) return drawShape(sp, st, c, mood || 'ok', opts, id);
    mood = mood || 'ok';
    var calm = mood === 'ok' || mood === 'happy';
    var eyeMood = fl.tired && calm ? 'lazy' : (fl.pudgy && mood === 'happy' ? 'ok' : mood);
    if (opts.blink && eyeMood !== 'asleep' && eyeMood !== 'eat') eyeMood = 'asleep';
    var mouthMood = (fl.pudgy || fl.thin || fl.dirty) && calm ? 'grubby' : mood;
    var bw = fl.pudgy ? 1.32 : fl.thin ? 0.72 : 1, bh = fl.pudgy ? 1.05 : fl.thin ? 0.97 : 1;
    var s = '<defs><filter id="' + id + 'd"><feColorMatrix type="saturate" values="0.3"/></filter>' +
      '<radialGradient id="' + id + 'v" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></radialGradient>' +
      '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>';
    s += ellipse(100, 186, 50 * g.scale * (fl.pudgy ? 1.2 : 1), 9, 'url(#' + id + 'g)');
    s += '<g transform="translate(100 186) scale(' + g.scale + ') translate(-100 -186)"' + (fl.thin ? ' filter="url(#' + id + 'd)"' : '') + '><g class="cre-breathe">';
    var lazy = mood === 'lazy' || mood === 'asleep';
    var brx = g.brx * bw * (lazy ? 1.1 : 1), bry = g.bry * bh * (lazy ? 0.86 : 1), by = g.by + (lazy ? 6 : 0) + (fl.pudgy ? 2 : 0);
    if (sp.long) brx *= 1.3;
    var tRot = opts.tailRot && mood !== 'asleep' ? ' transform="rotate(' + opts.tailRot + ' ' + f(bx + g.brx * 0.65) + ' ' + f(g.by + g.bry * 0.3) + ')"' : '';
    s += '<g class="cre-tail"' + tRot + '>' + tail(sp, st, g, c, bx) + '</g>';
    var wsc = opts.wingFlap ? ' transform="translate(100 0) scale(' + opts.wingFlap + ' 1) translate(-100 0)"' : '';
    s += '<g class="cre-wings"' + wsc + '>' + wings(sp, st, g, c, bx, by) + '</g>';
    if (!sp.blob) {
    s += legs6(sp, st, g, c, bx, by, brx, bry);
    s += ellipse(bx, by, brx, bry, c.main, o);
    if (sp.pattern !== 'ladybug' && sp.pattern !== 'beetle') {
      s += ellipse(bx, by + bry * 0.18, brx * 0.62, bry * 0.66, sp.belly || c.light);
      s += path(P('M', bx - brx * 0.18, by + bry * 0.55, 'q', brx * 0.09, 5, brx * 0.18, 0, 'q', brx * 0.09, 5, brx * 0.18, 0), 'none', { stroke: c.dark, 'stroke-width': 1.6, opacity: 0.25, 'stroke-linecap': 'round' });
    }
    s += pattern(sp, st, g, c, bx, by, brx, bry);
    s += chestFluff(sp, g, c, bx, by, brx, bry);
    s += volume(id, bx, by, brx, bry);
    if (sp.family !== 'bug') [-1, 1].forEach(function (d) { s += path(P('M', bx + d * brx * 0.84, by - bry * 0.1, 'q', d * 3, 5, 0, 10, 'M', bx + d * brx * 0.78, by + bry * 0.25, 'q', d * 3, 5, 0, 9), 'none', { stroke: c.dark, 'stroke-width': 1.7, 'stroke-linecap': 'round', opacity: 0.35 }); });
    if (fl.thin) for (var r = 0; r < 3; r++) s += path(P('M', bx - brx * 0.4, by - 8 + r * 9, 'Q', bx, by - 3 + r * 9, bx + brx * 0.4, by - 8 + r * 9), 'none', { stroke: c.dark, 'stroke-width': 2, opacity: 0.6, 'stroke-linecap': 'round' });
    if (fl.pudgy) s += path(P('M', bx - brx * 0.35, by + bry * 0.35, 'Q', bx, by + bry * 0.55, bx + brx * 0.35, by + bry * 0.35), 'none', { stroke: c.dark, 'stroke-width': 2, opacity: 0.35 });
    if (st === 2 && sp.crest === 'flame') s += path(P('M', bx - brx * 0.9, by - 6, 'l 10 4 M', bx + brx * 0.9, by - 6, 'l -10 4'), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
    var fy = by + bry - 3;
    [-1, 1].forEach(function (d) {
      var fx = bx + d * brx * 0.52, fw = g.foot * (fl.thin ? 0.8 : 1);
      s += ellipse(fx, fy, fw, g.foot * 0.62, sp.footColor || c.main, sp.footColor ? outline('#b8651a') : o);
      if (sp.family !== 'bug') s += path(P('M', fx - fw * 0.3, fy + g.foot * 0.1, 'l 0 4 M', fx + fw * 0.3, fy + g.foot * 0.1, 'l 0 4'), 'none', { stroke: c.dark, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.6 });
      s += ellipse(fx - fw * 0.3, fy - g.foot * 0.25, fw * 0.35, g.foot * 0.16, '#fff', { opacity: 0.35 });
    });
    }
    s += extras(sp, st, g, c, hx);
    s += collar(sp, st, g, c, hx);
    s += behindHead(sp, st, g, c, hx);
    if (sp.heads === 3) [-1, 1].forEach(function (d) {
      var sx = hx + d * g.hr * 1.02, sy = g.hy + g.hr * 0.18;
      s += '<g transform="translate(' + f(sx) + ' ' + f(sy) + ') scale(0.7) translate(' + f(-sx) + ' ' + f(-g.hy) + ')">' + ears(sp, st, g, c, sx) + fluffs(sp, g, c, sx) + circle(sx, g.hy, g.hr, c.main, o) + volume(id, sx, g.hy, g.hr, g.hr) + frontEars(sp, st, g, c, sx) + faceMarks(sp, st, g, c, sx) +
        mouth(sp, g, c, sx, mood === 'asleep' ? 'asleep' : d < 0 ? 'happy' : 'ok') + '<g class="cre-eyes">' + eyes(st, g, c, sx, mood === 'asleep' || opts.blink ? 'asleep' : d < 0 ? 'ok' : 'happy', sp) + '</g>' + postFace(sp, st, g, c, sx, mood) + '</g>';
    });
    s += ears(sp, st, g, c, hx);
    s += fluffs(sp, g, c, hx);
    var hr = g.hr * (fl.pudgy ? 1.05 : fl.thin ? 0.95 : 1);
    s += circle(hx, g.hy, hr, c.main, o);
    s += frontEars(sp, st, g, c, hx);
    s += faceMarks(sp, st, g, c, hx);
    s += volume(id, hx, g.hy, hr, hr);
    if (sp.blob) {
      [-1, 1].forEach(function (d) {
        s += '<g transform="rotate(' + (d * -25) + ' ' + f(hx + d * hr * 0.95) + ' ' + f(g.hy + hr * 0.25) + ')">' + ellipse(hx + d * hr * 0.98, g.hy + hr * 0.25, 10, 7.5, c.main, o) + '</g>';
        s += ellipse(hx + d * hr * 0.42, g.hy + hr * 0.95, g.foot * 1.25, g.foot * 0.62, sp.footColor || c.dark, o) + ellipse(hx + d * hr * 0.42 - 4, g.hy + hr * 0.95 - 3, g.foot * 0.45, g.foot * 0.18, '#fff', { opacity: 0.35 });
      });
      if (mood === 'lazy' || mood === 'asleep') s += ellipse(hx, g.hy + hr * 0.6, hr * 0.5, hr * 0.12, c.dark, { opacity: 0.12 });
    }
    if (sp.crest !== 'nemes' && sp.crest !== 'bangs') s += path(P('M', hx - hr * 0.62, g.hy - hr * 0.5, 'Q', hx - hr * 0.42, g.hy - hr * 0.82, hx - hr * 0.08, g.hy - hr * 0.9), 'none', { stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.45 });
    if (fl.pudgy) [-1, 1].forEach(function (d) { s += ellipse(hx + d * g.hr * 0.7, g.hy + g.hr * 0.32, g.hr * 0.3, g.hr * 0.22, c.main); });
    if (fl.thin) [-1, 1].forEach(function (d) { s += path(P('M', hx + d * g.hr * 0.55, g.hy + g.hr * 0.05, 'q', d * 4, 10, 0, 18), 'none', { stroke: c.dark, 'stroke-width': 2, opacity: 0.45 }); });
    s += crest(sp, st, g, c, hx);
    if (fl.dirty) s += messyHair(g, c, hx);
    if (!fl.thin && !fl.dirty) [-1, 1].forEach(function (d) { s += ellipse(hx + d * g.hr * 0.62, g.hy + g.hr * 0.3, g.hr * 0.17, g.hr * 0.11, '#ff8fa3', { opacity: 0.5 }) + circle(hx + d * g.hr * 0.66, g.hy + g.hr * 0.27, 1.6, '#fff', { opacity: 0.7 }); });
    s += mouth(sp, g, c, hx, mouthMood);
    var gEye = sp.ears === 'bumps' ? assign(assign({}, g), { ey: -g.hr * 0.72, ed: g.hr * 0.5 }) : g;
    s += '<g class="cre-eyes">' + eyes(st, gEye, c, hx, eyeMood, sp) + '</g>';
    s += postFace(sp, st, g, c, hx, eyeMood);
    if (fl.tired && mood !== 'asleep') [-1, 1].forEach(function (d) {
      var ex = hx + d * g.ed, ey = g.hy + g.ey + g.er[1] + 2;
      s += path(P('M', ex - g.er[0], ey, 'Q', ex, ey + 7, ex + g.er[0], ey), 'none', { stroke: '#7b5aa6', 'stroke-width': 2.5, opacity: 0.75, 'stroke-linecap': 'round' });
    });
    if ((fl.pudgy || fl.dirty) && calm && !fl.tired) [-1, 1].forEach(function (d) {
      var ex = hx + d * g.ed, ey = g.hy + g.ey - g.er[1];
      s += path(P('M', ex - d * g.er[0] * 1.2, ey - 1, 'L', ex + d * g.er[0] * 0.9, ey - 6), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
    });
    if (opts.acc) s += accessory(opts.acc, g, hx, c);
    s += moodFx(g, hx, mood === 'grubby' ? 'ok' : mood);
    if (fl.dirty) s += dirtFx(g, hx, by);
    s += '</g></g>';
    if (fl.dirty && !opts.noStink) s += stink();
    if (sp.rare || opts.glow) s = '<g opacity=".85">' + path(starPath(18, 20, 7, 3), '#ffe27a') + path(starPath(186, 50, 5, 2), '#ffe27a') + path(starPath(170, 150, 4, 1.8), '#ffe27a') + '</g>' + s;
    if (opts.shine) s += path('M30 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z', '#ffe27a') + path('M168 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z', '#ffe27a');
    return '<svg viewBox="-6 -34 212 234" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + sp.names[st] + '" class="cre">' + s + '</svg>';
  }
  function messyHair(g, c, hx) {
    var top = g.hy - g.hr, s = '';
    [[-26, 8], [-14, 0], [-2, -4], [10, 0], [22, 6]].forEach(function (t, i) {
      var x = hx + t[0], y = top + t[1] + 6;
      s += path(P('M', x - 6, y + 4, 'L', x - 2 + (i % 2 ? 6 : -6), y - 12, 'L', x + 2, y, 'L', x + 7 + (i % 2 ? -4 : 5), y - 10, 'L', x + 6, y + 5, 'Z'), c.dark, { opacity: 0.85 });
    });
    return s;
  }
  function dirtFx(g, hx, by) {
    var s = '';
    [[-22, 12, 7], [18, 22, 6], [-6, -18, 5], [24, -8, 4]].forEach(function (m) { s += ellipse(hx + m[0], g.hy + m[1], m[2] * 1.3, m[2], '#7a5a3a', { opacity: 0.8 }); });
    [[-12, by + 4, 8], [14, by + 12, 7], [0, by - 10, 5]].forEach(function (m) { s += ellipse(hx + m[0], m[1], m[2] * 1.3, m[2], '#7a5a3a', { opacity: 0.8 }); });
    return s;
  }
  /* green stink lines that curl, drift up and fade on a loop (SVG animation, so they move wherever the picture is shown);
     the town draws its own on the canvas (opts.noStink) */
  function stink() {
    var s = '', col = '#7fc241';
    [[150, 60, 0], [165, 34, 0.6], [40, 52, 1.2]].forEach(function (p, i) {
      var x = p[0], y = p[1], b = '-' + p[2].toFixed(1) + 's', a = 'M' + x + ' ' + y + ' q 8 -8 0 -16 q -8 -8 0 -16', z = 'M' + x + ' ' + y + ' q -8 -8 0 -16 q 8 -8 0 -16';
      s += '<g opacity=".85"><path d="' + a + '" fill="none" stroke="' + col + '" stroke-width="4" stroke-linecap="round"><animate attributeName="d" values="' + a + ';' + z + ';' + a + '" dur="0.9s" begin="' + b + '" repeatCount="indefinite"/></path>' +
        circle(x + (i ? -6 : 8), y - 36, 7, col, { opacity: 0.35 }) +
        '<animateTransform attributeName="transform" type="translate" values="0 8;' + (i % 2 ? -4 : 4) + ' -2;0 -12" dur="1.8s" begin="' + b + '" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0;.9;.9;0" keyTimes="0;.25;.7;1" dur="1.8s" begin="' + b + '" repeatCount="indefinite"/></g>';
    });
    return s;
  }
  function byId(id) { for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].id === id) return SPECIES[i]; return null; }
  function randomPalette(sp) {
    var normal = [], rare = [];
    sp.palettes.forEach(function (p, i) { (p.rare ? rare : normal).push(i); });
    if (rare.length && Math.random() < 0.06) return rare[Math.floor(Math.random() * rare.length)];
    return normal[Math.floor(Math.random() * normal.length)];
  }
  /* The rare egg: gold, speckled, glowing. */
  function egg(size) {
    var s = '<defs><radialGradient id="egg-glow"><stop offset="0" stop-color="#fff6b0" stop-opacity=".95"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient></defs>' +
      circle(100, 110, 92, 'url(#egg-glow)') +
      path('M100 36 C140 36 158 96 158 124 C158 160 132 180 100 180 C68 180 42 160 42 124 C42 96 60 36 100 36 Z', '#f6c945', { stroke: '#b8860b', 'stroke-width': 4 }) +
      path('M60 118 Q80 104 100 118 Q120 132 140 118', 'none', { stroke: '#fff3b8', 'stroke-width': 6, 'stroke-linecap': 'round' }) +
      path(starPath(82, 86, 10, 4.5), '#fffbe0') + path(starPath(122, 150, 8, 3.5), '#fffbe0') + circle(118, 92, 5, '#e8a92b') + circle(76, 148, 6, '#e8a92b') +
      ellipse(80, 70, 10, 16, '#ffffff', { opacity: 0.5, transform: 'rotate(-20 80 70)' }) +
      path(starPath(30, 40, 9, 4), '#ffe27a') + path(starPath(176, 60, 7, 3), '#ffe27a') + path(starPath(170, 176, 6, 2.5), '#ffe27a');
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rare egg"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + '>' + s + '</svg>';
  }
  function starters(seedStr) {
    var all = SPECIES.filter(function (s) { return !s.rare; });
    if (seedStr == null) return all;
    var h = 7; for (var i = 0; i < String(seedStr).length; i++) h = (h * 31 + String(seedStr).charCodeAt(i)) % 2147483647;
    function rnd() { h = (h * 48271) % 2147483647; return h / 2147483647; }
    return ['Fire', 'Water', 'Leaf'].map(function (t) { var pool = all.filter(function (s) { return s.type === t; }); return pool[Math.floor(rnd() * pool.length)]; });
  }
  function rares() { return SPECIES.filter(function (s) { return s.rare; }); }
  /* where the head sits in a drawn pet picture (viewBox -6 -34 212 234), so games can aim at the face */
  function headSpot(spId, st, view) {
    var sp = byId(spId) || SPECIES[0], M = window.C3D_META && window.C3D_META[sp.id], v = view || 'three';
    st = Math.max(0, Math.min(2, st || 0));
    if (M && window.C3D && !C3D.off && M.stages[st] && M.stages[st].v[v]) {
      var m = M.stages[st], a = m.v[v], T = v === 'three' ? M.clay : M.toon, gx = a.ground[0], gy = a.ground[1], bb = a.bb || [0, 0, T, T];
      var k = Math.min(U3 * m.span / T, 104 / Math.max(gx - bb[0], 1), 104 / Math.max(bb[2] - gx, 1), 218 / Math.max(gy - bb[1], 1));
      return { x: 100 + (a.head[0] - gx) * k, y: 186 + (a.head[1] - gy) * k, r: a.head[2] * k };
    }
    var g = sp.blob ? BLOB[st] : GEO[st];
    return { x: 100, y: 186 - (186 - g.hy) * g.scale, r: g.hr * g.scale };
  }
  /* where the mouth is in the pet picture (same coordinates as headSpot); a guess under the head when the art has none */
  function mouthSpot(spId, st, view) {
    var sp = byId(spId) || SPECIES[0], M = window.C3D_META && window.C3D_META[sp.id], v = view || 'three', h = headSpot(spId, st, v);
    st = Math.max(0, Math.min(2, st || 0));
    if (M && window.C3D && !C3D.off && M.stages[st] && M.stages[st].v[v]) {
      var m = M.stages[st], a = m.v[v], T = v === 'three' ? M.clay : M.toon, gx = a.ground[0], gy = a.ground[1], bb = a.bb || [0, 0, T, T], mo = a.mouth;
      var k = Math.min(U3 * m.span / T, 104 / Math.max(gx - bb[0], 1), 104 / Math.max(bb[2] - gx, 1), 218 / Math.max(gy - bb[1], 1));
      if (mo && mo[4]) return { x: 100 + (mo[0] - gx) * k, y: 186 + (mo[1] - gy) * k, r: h.r };
    }
    return { x: h.x, y: h.y + h.r * 0.45, r: h.r };
  }
  window.CRE = { SPECIES: SPECIES, draw: draw, byId: byId, randomPalette: randomPalette, egg: egg, starters: starters, rares: rares, accessory: accessory, headSpot: headSpot, mouthSpot: mouthSpot };
})();
