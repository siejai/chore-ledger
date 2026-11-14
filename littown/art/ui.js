/* ui.js — interface icons (96x96, layer ui) and the app icon (512x512). */
(function () {
  var INK = '#3B2F45';
  function S(body, vb) { return { layer: 'ui', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb || '0 0 96 96') + '">' + body + '</svg>' }; }
  var STAR = 'M48 10Q51 10 53 15L60 29Q61 32 64 32L80 34Q86 35 82 40L70 51Q68 53 69 56L72 72Q73 78 68 75L54 67Q48 64 42 67L28 75Q23 78 24 72L27 56Q28 53 26 51L14 40Q10 35 16 34L32 32Q35 32 36 29L43 15Q45 10 48 10Z';
  var HEART = 'M48 82Q14 60 12 38Q11 20 28 17Q40 16 48 28Q56 16 68 17Q85 20 84 38Q82 60 48 82Z';
  var THUMB = 'M14 46Q14 42 18 42H26Q30 42 30 46V78Q30 82 26 82H18Q14 82 14 78Z' +
    'M36 46L50 22Q54 14 60 18Q66 22 63 32L60 42H76Q86 42 84 52L79 74Q77 82 68 82H40Q36 82 36 78Z';
  var FLAME = 'M32 88Q16 88 16 70Q16 54 25 41Q29 49 35 50Q33 33 42 22Q48 14 51 6Q61 17 64 29Q68 25 70 18Q80 33 80 62Q80 88 60 88Z';
  var FLAME_MID = 'M38 82Q26 82 26 70Q26 60 33 52Q36 58 41 58Q40 45 50 32Q56 44 61 48Q64 45 65 40Q70 50 70 64Q70 82 56 82Z';
  ART.pack('ui', {
    'ui-back': S('<path fill="' + INK + '" d="M14 48L44 20Q50 15 54 20Q57 24 53 29L40 42H80Q86 42 86 48Q86 54 80 54H40L53 67Q57 72 54 76Q50 81 44 76Z"/>'),
    'ui-next': S('<path fill="' + INK + '" d="M84 48L54 18Q48 12 43 18Q39 23 44 28L56 40H16Q8 40 8 48Q8 56 16 56H56L44 68Q39 73 43 78Q48 84 54 78Z"/>'),
    'ui-skip': S('<path fill="' + INK + '" d="M14 26Q14 20 19 23L46 43Q51 48 46 53L19 73Q14 76 14 70Z"/>' +
      '<path fill="' + INK + '" d="M46 26Q46 20 51 23L78 43Q83 48 78 53L51 73Q46 76 46 70Z"/>' +
      '<rect fill="' + INK + '" x="80" y="22" width="7" height="52" rx="3.5"/>'),
    'ui-map': S('<path fill="#FFE79A" d="M10 24Q10 20 14 19L34 13L62 21L82 15Q86 14 86 18V72Q86 76 82 77L62 83L34 75L14 81Q10 82 10 78Z"/>' +
      '<path fill="#9BE3B5" d="M34 13L62 21V83L34 75Z"/>' +
      '<g fill="' + INK + '"><circle cx="20" cy="64" r="3"/><circle cx="26" cy="55" r="3"/><circle cx="35" cy="51" r="3"/><circle cx="44" cy="54" r="3"/><circle cx="53" cy="58" r="3"/><circle cx="61" cy="53" r="3"/><circle cx="65" cy="45" r="3"/></g>' +
      '<path fill="#E5484D" d="M72 22Q82 22 82 32Q82 40 72 48Q62 40 62 32Q62 22 72 22Z"/><circle fill="#FFFDF7" cx="72" cy="32" r="4"/>'),
    'ui-speaker': S('<path fill="' + INK + '" d="M12 40Q12 36 16 36H28L46 20Q52 16 52 24V72Q52 80 46 76L28 60H16Q12 60 12 56Z"/>' +
      '<path fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" d="M62 36Q68 48 62 60M72 26Q86 48 72 70"/>'),
    'ui-star': S('<path fill="#FFD23F" d="' + STAR + '"/>'),
    'ui-check': S('<circle fill="#4CC27A" cx="48" cy="48" r="40"/><path fill="none" stroke="#FFFDF7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" d="M29 49L42 62L67 35"/>'),
    'ui-lock': S('<path fill="' + INK + '" d="M25 44V32Q25 9 48 9Q71 9 71 32V44H61V32Q61 19 48 19Q35 19 35 32V44Z"/>' +
      '<rect fill="' + INK + '" x="18" y="40" width="60" height="46" rx="12"/><circle fill="#FFD23F" cx="48" cy="58" r="7"/><rect fill="#FFD23F" x="45" y="60" width="6" height="14" rx="3"/>'),
    'ui-gear': S('<g fill="' + INK + '"><rect x="40" y="6" width="16" height="22" rx="5"/><rect x="40" y="68" width="16" height="22" rx="5"/>' +
      '<rect x="40" y="6" width="16" height="22" rx="5" transform="rotate(60 48 48)"/><rect x="40" y="68" width="16" height="22" rx="5" transform="rotate(60 48 48)"/>' +
      '<rect x="40" y="6" width="16" height="22" rx="5" transform="rotate(120 48 48)"/><rect x="40" y="68" width="16" height="22" rx="5" transform="rotate(120 48 48)"/>' +
      '<circle cx="48" cy="48" r="30"/></g><circle fill="#FFFDF7" cx="48" cy="48" r="12"/>'),
    'ui-thumb-up': S('<path fill="#4CC27A" d="' + THUMB + '"/>'),
    'ui-thumb-down': S('<path fill="#FF7A6B" transform="rotate(180 48 48)" d="' + THUMB + '"/>'),
    'ui-sparkle': S('<path fill="#FFD23F" d="M48 6Q52 6 53 14Q56 38 82 43Q90 44 90 48Q90 52 82 53Q56 58 53 82Q52 90 48 90Q44 90 43 82Q40 58 14 53Q6 52 6 48Q6 44 14 43Q40 38 43 14Q44 6 48 6Z"/>'),
    'ui-book': S('<path fill="' + INK + '" d="M8 28Q8 24 12 24Q30 24 48 32Q66 24 84 24Q88 24 88 28V76Q88 80 84 80Q66 80 48 88Q30 80 12 80Q8 80 8 76Z"/>' +
      '<path fill="#FFFDF7" d="M14 22Q30 20 45 30V80Q30 72 14 74Z"/><path fill="#CFEAFE" d="M82 22Q66 20 51 30V80Q66 72 82 74Z"/>' +
      '<path fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" opacity=".35" d="M21 38Q30 37 38 42M21 50Q30 49 38 54M58 42Q66 37 75 38M58 54Q66 49 75 50"/>'),
    'ui-play': S('<circle fill="' + INK + '" cx="48" cy="48" r="40"/><path fill="#FFD23F" d="M38 30Q38 25 43 28L66 44Q70 48 66 52L43 68Q38 71 38 66Z"/>'),
    'ui-hanger': S('<path fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" d="M38 24Q38 14 48 14Q58 14 58 24Q58 30 48 36V40L12 66Q6 72 14 72H82Q90 72 84 66L48 40"/>'),
    'ui-plus': S('<rect fill="' + INK + '" x="40" y="12" width="16" height="72" rx="8"/><rect fill="' + INK + '" x="12" y="40" width="72" height="16" rx="8"/>'),
    // writing: free drawing, her name, the pile of letters to practise, a pencil
    'ui-free-draw': S('<path fill="none" stroke="#3D8BFD" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" d="M12 66Q24 30 36 52Q46 72 56 46Q66 22 84 34"/><circle fill="#FF9F43" cx="84" cy="34" r="8"/>'),
    'ui-my-name': S('<rect fill="#F76CA8" x="8" y="22" width="80" height="54" rx="12"/><rect fill="#FFFDF7" x="16" y="38" width="64" height="30" rx="6"/><rect fill="#F76CA8" x="40" y="14" width="16" height="14" rx="5"/><path fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round" d="M24 56Q30 46 34 56Q38 64 44 52M50 60V48Q56 44 60 50V60M66 52Q72 46 74 56"/>'),
    'ui-letter-pile': S('<rect fill="#E4DCCB" x="22" y="18" width="50" height="58" rx="8" transform="rotate(-10 47 47)"/><rect fill="#FFE79A" x="26" y="22" width="50" height="58" rx="8" transform="rotate(6 51 51)"/><rect fill="#FFFDF7" x="24" y="26" width="50" height="58" rx="8"/><path fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" d="M58 46V72M58 59Q58 46 46 46Q36 46 36 59Q36 72 46 72Q58 72 58 59"/>'),
    'ui-pencil': S('<path fill="#FFD23F" d="M20 70L64 26L76 38L32 82Z"/><path fill="#F76CA8" d="M64 26L72 18Q76 14 80 18L84 22Q88 26 84 30L76 38Z"/><path fill="#E9D3A6" d="M20 70L32 82L14 88Z"/><path fill="' + INK + '" d="M14 88L17 79L23 85Z"/>'),
    // bakery rooms: the shop front, the back kitchen, the cafe
    'ui-room-shop': { layer: 'ui', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="14" y="40" width="68" height="46" rx="6" fill="#FFF1DC"/><path d="M10 40h76l-6-20h-64z" fill="#FF7A6B"/><path d="M22 20h12l-2 20h-12zM46 20h12v20h-12zM70 20h4l6 20h-12z" fill="#FFFDF7"/><rect x="30" y="54" width="20" height="32" rx="3" fill="#C98B5A"/><rect x="56" y="54" width="20" height="16" rx="3" fill="#CFEAFE"/></svg>' },
    'ui-room-bakekitchen': { layer: 'ui', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="14" y="22" width="68" height="64" rx="10" fill="#B8B2C2"/><rect x="22" y="40" width="52" height="36" rx="6" fill="#3B2F45"/><rect x="28" y="46" width="40" height="24" rx="4" fill="#FF9F43"/><circle cx="28" cy="31" r="4" fill="#FFD23F"/><circle cx="40" cy="31" r="4" fill="#FF7A6B"/><rect x="52" y="28" width="22" height="7" rx="3" fill="#6F6880"/></svg>' },
    'ui-room-cafe': { layer: 'ui', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="16" y="40" width="40" height="40" rx="8" fill="#FFFDF7"/><path d="M56 50q16 0 16 12t-16 12" fill="none" stroke="#FFFDF7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><rect x="20" y="44" width="32" height="8" rx="4" fill="#8A5A3B"/><path d="M28 30q4-8 0-14M40 30q4-8 0-14" fill="none" stroke="#FF9EC4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M58 84l20-30l10 30z" fill="#FFE79A"/><path d="M58 84l20-30l3 6l-14 24z" fill="#FF9EC4"/></svg>' },
    'ui-room-class': { layer: 'ui', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="10" y="14" width="76" height="58" rx="9" fill="#C98B5A"/><rect x="18" y="22" width="60" height="42" rx="4" fill="#2E9E63"/><path d="M28 46q5-10 10 0t10 0t10 0" fill="none" stroke="#FFFDF7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="26" y="30" width="14" height="4" rx="2" fill="#FFFDF7" opacity="0.6"/><rect x="14" y="70" width="68" height="8" rx="4" fill="#8A5A3B"/><rect x="56" y="64" width="14" height="6" rx="3" fill="#FFFDF7"/><path d="M30 78l-6 12M66 78l6 12" fill="none" stroke="#8A5A3B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    'ui-room-library': { layer: 'ui', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="14" y="26" width="16" height="56" rx="4" fill="#E5484D"/><rect x="32" y="16" width="20" height="66" rx="4" fill="#3D8BFD"/><rect x="54" y="30" width="14" height="52" rx="4" fill="#FFD23F"/><rect x="64" y="26" width="16" height="56" rx="4" fill="#4CC27A" transform="rotate(16 72 82)"/><rect x="17" y="36" width="10" height="5" rx="2" fill="#FFFDF7"/><rect x="36" y="28" width="12" height="5" rx="2" fill="#FFFDF7"/><rect x="57" y="40" width="8" height="5" rx="2" fill="#FFFDF7"/><rect x="8" y="80" width="80" height="9" rx="4" fill="#C98B5A"/></svg>' },
    'ui-room-music': { layer: 'ui', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><ellipse cx="30" cy="72" rx="13" ry="10" fill="#8E6CEF" transform="rotate(-20 30 72)"/><ellipse cx="68" cy="62" rx="13" ry="10" fill="#8E6CEF" transform="rotate(-20 68 62)"/><rect x="37" y="24" width="7" height="48" rx="3" fill="#8E6CEF"/><rect x="75" y="14" width="7" height="48" rx="3" fill="#8E6CEF"/><path d="M37 22L82 12V26L37 36Z" fill="#8E6CEF"/><circle cx="18" cy="30" r="5" fill="#FFD23F"/><circle cx="86" cy="80" r="4" fill="#FFD23F"/></svg>' },
    'ui-trash': S('<path fill="' + INK + '" d="M22 32H74L69 82Q68 88 62 88H34Q28 88 27 82Z"/><rect fill="' + INK + '" x="14" y="20" width="68" height="10" rx="5"/>' +
      '<rect fill="' + INK + '" x="38" y="10" width="20" height="12" rx="5"/><rect fill="#FFFDF7" x="35" y="42" width="6" height="36" rx="3"/><rect fill="#FFFDF7" x="55" y="42" width="6" height="36" rx="3"/>'),
    'ui-bubble': S('<path fill="' + INK + '" d="M20 14H76Q88 14 88 26V58Q88 70 76 70H42L24 86Q20 89 20 84V70Q8 70 8 58V26Q8 14 20 14Z"/>' +
      '<circle fill="#FFFDF7" cx="30" cy="42" r="7"/><circle fill="#FFFDF7" cx="48" cy="42" r="7"/><circle fill="#FFFDF7" cx="66" cy="42" r="7"/>'),
    'ui-hand': S('<path fill="#FFC59E" d="M41 14Q41 8 47 8Q53 8 53 14V44Q55 40 60 40Q66 40 66 46V48Q68 44 73 44Q79 44 79 50V52Q81 48 85 49Q90 50 90 56V68Q90 88 68 88H54Q44 88 36 80L22 64Q18 58 22 55Q27 51 32 56L41 64Z"/>' +
      '<path fill="none" stroke="#3B2F45" stroke-width="3" stroke-linecap="round" opacity=".3" d="M53 56V66M66 56V66M79 58V66"/>'),
    'ui-music': S('<path fill="' + INK + '" d="M36 22Q36 18 40 17L76 9Q82 8 82 14V64Q82 76 68 76Q58 76 58 68Q58 60 70 58Q72 58 74 58V30L44 37V72Q44 84 30 84Q20 84 20 76Q20 68 32 66Q34 66 36 66Z"/>'),
    'ui-heart': S('<path fill="#F76CA8" d="' + HEART + '"/>'),
    'ui-flame': S('<path fill="#FF9F43" d="' + FLAME + '"/><path fill="#FFD23F" d="' + FLAME_MID + '"/><path fill="#FFE79A" d="M48 80Q38 80 38 71Q38 63 48 53Q58 63 58 71Q58 80 48 80Z"/>'),
    'ui-flame-empty': S('<path fill="#E4DCCB" d="' + FLAME + '"/><path fill="#D6CCB8" d="' + FLAME_MID + '"/>'),
    'ui-shop': S('<path fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" d="M35 36V30Q35 15 48 15Q61 15 61 30V36"/>' +
      '<path fill="' + INK + '" d="M24 32H72Q77 32 78 37L83 80Q84 88 76 88H20Q12 88 13 80L18 37Q19 32 24 32Z"/>' +
      '<path fill="#F76CA8" d="M48 76Q33 67 32 58Q31 50 39 49Q44 49 48 54Q52 49 57 49Q65 50 64 58Q63 67 48 76Z"/>'),
    'ui-decor': S('<rect fill="' + INK + '" x="20" y="28" width="52" height="44" rx="16"/>' +
      '<rect fill="' + INK + '" x="20" y="74" width="8" height="14" rx="4"/><rect fill="' + INK + '" x="64" y="74" width="8" height="14" rx="4"/>' +
      '<rect fill="' + INK + '" x="8" y="48" width="22" height="34" rx="11"/><rect fill="' + INK + '" x="62" y="48" width="22" height="34" rx="11"/>' +
      '<rect fill="' + INK + '" x="16" y="62" width="60" height="20" rx="8"/><rect fill="#FF9EC4" x="30" y="58" width="32" height="14" rx="7"/>' +
      '<path fill="#FFD23F" d="M80 2Q82 2 83 7Q84 13 89 14Q94 15 94 17Q94 19 89 20Q84 21 83 27Q82 32 80 32Q78 32 77 27Q76 21 71 20Q66 19 66 17Q66 15 71 14Q76 13 77 7Q78 2 80 2Z"/>'),
    'ui-store': S('<rect fill="#FF7A6B" x="41" y="4" width="14" height="24" rx="6"/><path fill="#FF7A6B" d="M28 28Q25 23 31 23H65Q71 23 68 28L52 45Q48 49 44 45Z"/>' +
      '<path fill="' + INK + '" d="M15 54L5 42Q2 38 7 38H24Q27 38 29 41L36 54Z"/><path fill="' + INK + '" d="M81 54L91 42Q94 38 89 38H72Q69 38 67 41L60 54Z"/>' +
      '<rect fill="' + INK + '" x="12" y="50" width="72" height="10" rx="5"/><path fill="' + INK + '" d="M16 56H80V80Q80 88 72 88H24Q16 88 16 80Z"/>' +
      '<rect fill="#FFFDF7" x="36" y="68" width="24" height="7" rx="3.5"/>'),
    'ui-town': S('<path fill="' + INK + '" d="M8 48Q4 48 7 45L28 24Q32 20 36 24L57 45Q60 48 56 48H52V84Q52 88 48 88H16Q12 88 12 84V48Z"/>' +
      '<rect fill="#FFD23F" x="21" y="52" width="22" height="20" rx="5"/><rect fill="' + INK + '" x="30.5" y="52" width="3" height="20"/><rect fill="' + INK + '" x="21" y="60.5" width="22" height="3"/>' +
      '<path fill="' + INK + '" d="M56 62Q52 62 55 59L71 43Q75 39 79 43L95 59Q98 62 94 62H91V84Q91 88 87 88H63Q59 88 59 84V62Z"/>' +
      '<path fill="#6F6880" d="M69 88V76Q69 70 75 70Q81 70 81 76V88Z"/>'),
    'ui-room-living': S('<rect fill="' + INK + '" x="18" y="22" width="60" height="42" rx="14"/>' +
      '<rect fill="' + INK + '" x="20" y="72" width="8" height="14" rx="4"/><rect fill="' + INK + '" x="68" y="72" width="8" height="14" rx="4"/>' +
      '<rect fill="' + INK + '" x="4" y="44" width="22" height="36" rx="11"/><rect fill="' + INK + '" x="70" y="44" width="22" height="36" rx="11"/>' +
      '<rect fill="' + INK + '" x="14" y="58" width="68" height="20" rx="8"/><rect fill="#FF9EC4" x="27" y="52" width="20" height="13" rx="6"/><rect fill="#FF9EC4" x="49" y="52" width="20" height="13" rx="6"/>'),
    'ui-room-bedroom': S('<rect fill="' + INK + '" x="6" y="22" width="16" height="64" rx="7"/><rect fill="' + INK + '" x="74" y="46" width="16" height="40" rx="7"/>' +
      '<rect fill="' + INK + '" x="14" y="50" width="70" height="22" rx="9"/><rect fill="#FF9EC4" x="24" y="40" width="22" height="14" rx="7"/>' +
      '<rect fill="#7CC8F8" x="44" y="42" width="38" height="14" rx="6"/>'),
    'ui-room-kitchen': S('<rect fill="' + INK + '" x="22" y="6" width="52" height="84" rx="12"/><rect fill="#FFFDF7" x="22" y="34" width="52" height="4"/>' +
      '<rect fill="#7CC8F8" x="30" y="16" width="7" height="12" rx="3.5"/><rect fill="#7CC8F8" x="30" y="45" width="7" height="22" rx="3.5"/>' +
      '<rect fill="' + INK + '" x="28" y="86" width="10" height="6" rx="3"/><rect fill="' + INK + '" x="58" y="86" width="10" height="6" rx="3"/>'),
    'ui-room-bath': S('<circle fill="#7CC8F8" cx="60" cy="22" r="11"/><circle fill="#7CC8F8" cx="78" cy="34" r="7"/><circle fill="#7CC8F8" cx="44" cy="38" r="6"/>' +
      '<rect fill="' + INK + '" x="10" y="26" width="10" height="26" rx="5"/><rect fill="' + INK + '" x="10" y="22" width="20" height="9" rx="4.5"/>' +
      '<rect fill="' + INK + '" x="4" y="48" width="88" height="11" rx="5.5"/><path fill="' + INK + '" d="M10 56H86V64Q86 80 70 80H26Q10 80 10 64Z"/>' +
      '<rect fill="' + INK + '" x="20" y="76" width="10" height="14" rx="5"/><rect fill="' + INK + '" x="66" y="76" width="10" height="14" rx="5"/>'),
    'ui-room-deck': S('<path fill="#FFD23F" d="M22 52A26 26 0 0 1 74 52Z"/>' +
      '<g fill="#FFD23F"><rect x="45" y="4" width="6" height="14" rx="3"/><rect x="45" y="4" width="6" height="14" rx="3" transform="rotate(-50 48 52)"/><rect x="45" y="4" width="6" height="14" rx="3" transform="rotate(50 48 52)"/></g>' +
      '<rect fill="' + INK + '" x="4" y="46" width="88" height="9" rx="4.5"/>' +
      '<path fill="' + INK + '" d="M10 54h8v22h-8zM28 54h8v22h-8zM46 54h8v22h-8zM64 54h8v22h-8zM80 54h8v22h-8z"/>' +
      '<rect fill="' + INK + '" x="4" y="74" width="88" height="14" rx="5"/>'),
    'ui-fix': S('<path fill="' + INK + '" d="M66 6Q52 4 44 16Q38 26 42 36L12 66Q6 72 12 80L16 84Q24 90 30 84L60 54Q70 58 80 52Q92 44 90 30L76 42Q70 44 64 40L56 32Q52 26 56 20Z"/>' +
      '<circle fill="#FFFDF7" cx="22" cy="74" r="5"/>' +
      '<path fill="#FFD23F" d="M80 66Q82 66 83 71Q84 76 88 77Q92 78 92 80Q92 82 88 83Q84 84 83 89Q82 94 80 94Q78 94 77 89Q76 84 72 83Q68 82 68 80Q68 78 72 77Q76 76 77 71Q78 66 80 66Z"/>'),
    'ui-light': S('<path fill="#FFD23F" d="M48 10Q72 10 72 36Q72 48 62 58Q58 62 58 68H38Q38 62 34 58Q24 48 24 36Q24 10 48 10Z"/>' +
      '<rect fill="#FFFDF7" x="34" y="24" width="7" height="14" rx="3.5" opacity=".7"/>' +
      '<rect fill="' + INK + '" x="36" y="66" width="24" height="8" rx="4"/><rect fill="' + INK + '" x="36" y="76" width="24" height="8" rx="4"/><rect fill="' + INK + '" x="42" y="84" width="12" height="8" rx="4"/>' +
      '<path fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round" d="M10 34H16M80 34H86M16 12L21 17M80 12L75 17"/>')
  });
})();
