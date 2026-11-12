/* characters.js — the parts Lit Town's characters can wear, for the shop and the dress-up screen.
 * The drawing itself is www/js/lit-style.js (style C, the character kit shared with Chore Quest), driven by
 * www/js/avatar-render.js. This file only registers each part's id and label (ART.parts needs no svg here),
 * so the content checks and the shop know what exists. Prices and when things go on sale: world.json "outfits".
 * Face parts (eyes, brows, nose, mouth, cheeks, freckles) are all free and come straight from the kit. */
(function () {
  function reg(slot, list) {
    var d = {}, i;
    for (i = 0; i < list.length; i++) { d[list[i][0]] = { label: list[i][1], svg: '' }; }
    ART.parts(slot, d, 'characters');
  }

  /* hairstyles: the kit's ids. Free ones first, then the ones sold as places light up. */
  reg('hair', [
    ['bob', 'Bob'], ['long', 'Long'], ['puffs', 'Puffs'], ['ponytail', 'Ponytail'], ['braids', 'Braids'], ['curly', 'Curly'],
    ['highbun', 'High bun'], ['thick', 'Long & thick'], ['boxbraids', 'Braids with beads'], ['locs', 'Locs'], ['cornrows', 'Cornrows'],
    ['shaved', 'Shaved'], ['flippy', 'Flipped ends'], ['longcurly', 'Long curls'], ['bunches', 'Low bunches'], ['crop', 'Short crop'],
    ['topknot', 'Top knot'], ['sidetail', 'Side ponytail'], ['spacebuns', 'Space buns'], ['halfup', 'Half-up pigtails'],
    ['pigtails', 'Pigtails'], ['afropuff', 'Afro puff'], ['wavy', 'Wavy long'], ['fauxhawk', 'Faux hawk'], ['shag', 'Shag'],
    ['mohawk', 'Mohawk'], ['sideshave', 'Side shave'], ['crownbraid', 'Crown braid'], ['peekaboo', 'Side sweep'],
    ['twintails', 'Twin tails'], ['hime', 'Hime cut'], ['messybob', 'Messy bob'],
    ['spiky', 'Spiky'], ['flowing', 'Long flowing'], ['drills', 'Drill curls']
  ]);

  /* clothes (drawn by lit-style.js "wear"; every piece fits every body stretch) */
  reg('top', [['tee', 'T-shirt'], ['hoodie', 'Hoodie'], ['stripe', 'Stripes'], ['sweater', 'Sweater'], ['dress', 'Dress'], ['jacket', 'Jacket'], ['jersey', 'Jersey'], ['chef', 'Chef jacket']]);
  reg('bot', [['pants', 'Jeans'], ['skirt', 'Skirt'], ['shorts', 'Shorts'], ['tutu', 'Tutu'], ['leggings', 'Leggings'], ['cargo', 'Cargo pants']]);
  reg('shoes', [['sneakers', 'Sneakers'], ['boots', 'Boots'], ['sandals', 'Sandals'], ['rainboots', 'Rain boots']]);
  reg('acc', [['glasses', 'Glasses'], ['bow', 'Bow'], ['headband', 'Headband'], ['chefhat', 'Chef hat'], ['cap', 'Cap'], ['beanie', 'Beanie'], ['flowers', 'Flower crown']]);

  /* fantasy eye colours (sold at the park); the natural ones are free in the dress-up screen */
  var EYE = [['pink', 'Pink', '#FF5FA2'], ['red', 'Red', '#E5484D'], ['gold', 'Gold', '#F2B705'], ['teal', 'Teal', '#1FB5A8'], ['violet', 'Violet', '#8E5BD6'], ['ice', 'Ice', '#9FD8F5']];
  var d = {}, i;
  for (i = 0; i < EYE.length; i++) { d[EYE[i][0]] = { label: EYE[i][1], hex: EYE[i][2], svg: '' }; }
  ART.parts('eyecolor', d, 'characters');
})();
