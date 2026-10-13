// Bonus Lessons data: the countries of Europe (Dutch and English names, capitals, flags) and the provinces of the Netherlands.
// Flags are image files, not flag emoji, because Windows shows flag emoji as two letters.
// Loads in the browser (globals) and in node (module.exports) so the data can be tested.

// Flags are the SVG files in renderer/flags (flag-icons, MIT licence; see flags/LICENSE.txt).
const flagImg = (id, cls) => `<img class="flag${cls ? ' ' + cls : ''}" src="flags/${id}.svg" alt="" draggable="false">`;

// region: west | north | central | south | east (south includes the Balkans). cap/capEn: capital in Dutch and English. alt: other spellings that also count when typed.
const EUROPE_RAW = [
  ['nl', 'Nederland', 'the Netherlands', 'Amsterdam', 'Amsterdam', 'west'],
  ['be', 'België', 'Belgium', 'Brussel', 'Brussels', 'west'],
  ['lu', 'Luxemburg', 'Luxembourg', 'Luxemburg', 'Luxembourg', 'west'],
  ['fr', 'Frankrijk', 'France', 'Parijs', 'Paris', 'west'],
  ['gb', 'Verenigd Koninkrijk', 'United Kingdom', 'Londen', 'London', 'west', { name: ['Engeland', 'Groot-Brittannië'] }],
  ['ie', 'Ierland', 'Ireland', 'Dublin', 'Dublin', 'west'],
  ['mc', 'Monaco', 'Monaco', 'Monaco', 'Monaco', 'west'],
  ['dk', 'Denemarken', 'Denmark', 'Kopenhagen', 'Copenhagen', 'north'],
  ['se', 'Zweden', 'Sweden', 'Stockholm', 'Stockholm', 'north'],
  ['no', 'Noorwegen', 'Norway', 'Oslo', 'Oslo', 'north'],
  ['fi', 'Finland', 'Finland', 'Helsinki', 'Helsinki', 'north'],
  ['is', 'IJsland', 'Iceland', 'Reykjavik', 'Reykjavik', 'north'],
  ['ee', 'Estland', 'Estonia', 'Tallinn', 'Tallinn', 'north'],
  ['lv', 'Letland', 'Latvia', 'Riga', 'Riga', 'north'],
  ['lt', 'Litouwen', 'Lithuania', 'Vilnius', 'Vilnius', 'north'],
  ['de', 'Duitsland', 'Germany', 'Berlijn', 'Berlin', 'central'],
  ['ch', 'Zwitserland', 'Switzerland', 'Bern', 'Bern', 'central'],
  ['at', 'Oostenrijk', 'Austria', 'Wenen', 'Vienna', 'central'],
  ['li', 'Liechtenstein', 'Liechtenstein', 'Vaduz', 'Vaduz', 'central'],
  ['pl', 'Polen', 'Poland', 'Warschau', 'Warsaw', 'central'],
  ['cz', 'Tsjechië', 'Czechia', 'Praag', 'Prague', 'central', { name: ['Tsjechische Republiek'] }],
  ['sk', 'Slowakije', 'Slovakia', 'Bratislava', 'Bratislava', 'central'],
  ['hu', 'Hongarije', 'Hungary', 'Boedapest', 'Budapest', 'central'],
  ['si', 'Slovenië', 'Slovenia', 'Ljubljana', 'Ljubljana', 'central'],
  ['es', 'Spanje', 'Spain', 'Madrid', 'Madrid', 'south'],
  ['pt', 'Portugal', 'Portugal', 'Lissabon', 'Lisbon', 'south'],
  ['it', 'Italië', 'Italy', 'Rome', 'Rome', 'south'],
  ['mt', 'Malta', 'Malta', 'Valletta', 'Valletta', 'south'],
  ['gr', 'Griekenland', 'Greece', 'Athene', 'Athens', 'south'],
  ['cy', 'Cyprus', 'Cyprus', 'Nicosia', 'Nicosia', 'south'],
  ['ad', 'Andorra', 'Andorra', 'Andorra la Vella', 'Andorra la Vella', 'south'],
  ['sm', 'San Marino', 'San Marino', 'San Marino', 'San Marino', 'south'],
  ['va', 'Vaticaanstad', 'Vatican City', 'Vaticaanstad', 'Vatican City', 'south', { name: ['Vaticaan'] }],
  ['hr', 'Kroatië', 'Croatia', 'Zagreb', 'Zagreb', 'south'],
  ['ba', 'Bosnië en Herzegovina', 'Bosnia and Herzegovina', 'Sarajevo', 'Sarajevo', 'south', { name: ['Bosnië'] }],
  ['rs', 'Servië', 'Serbia', 'Belgrado', 'Belgrade', 'south'],
  ['me', 'Montenegro', 'Montenegro', 'Podgorica', 'Podgorica', 'south'],
  ['mk', 'Noord-Macedonië', 'North Macedonia', 'Skopje', 'Skopje', 'south', { name: ['Macedonië'] }],
  ['al', 'Albanië', 'Albania', 'Tirana', 'Tirana', 'south'],
  ['bg', 'Bulgarije', 'Bulgaria', 'Sofia', 'Sofia', 'east'],
  ['ro', 'Roemenië', 'Romania', 'Boekarest', 'Bucharest', 'east'],
  ['md', 'Moldavië', 'Moldova', 'Chisinau', 'Chisinau', 'east', { name: ['Moldova'] }],
  ['ua', 'Oekraïne', 'Ukraine', 'Kiev', 'Kyiv', 'east', { cap: ['Kyiv'] }],
  ['by', 'Wit-Rusland', 'Belarus', 'Minsk', 'Minsk', 'east', { name: ['Belarus'] }],
  ['ru', 'Rusland', 'Russia', 'Moskou', 'Moscow', 'east'],
];
const EUROPE = EUROPE_RAW.map(([id, name, en, cap, capEn, region, alt]) => ({ id, name, en, cap, capEn, region, cont: 'europe', nameAlt: (alt && alt.name) || [], capAlt: (alt && alt.cap) || [], flag: (cls) => flagImg(id, cls) }));
const EUROPE_REGIONS = [['west', 'West'], ['north', 'North'], ['central', 'Central'], ['south', 'South & Balkans'], ['east', 'East']];

// the twelve provinces: [id, name, English name if different, capital, capital in English, a small fact]
const PROVINCES = [
  ['gr', 'Groningen', '', 'Groningen', '', 'The most northern and eastern province, famous for its gas fields and big skies.'],
  ['fr', 'Friesland', 'Frisia', 'Leeuwarden', '', 'Has its own language, Frisian (Fryslân), and the Elfstedentocht skating tour.'],
  ['dr', 'Drenthe', '', 'Assen', '', 'Known for its hunebedden (stone-age tombs) and for the TT motor races in Assen.'],
  ['ov', 'Overijssel', '', 'Zwolle', '', 'Home to Giethoorn, the village with canals instead of streets.'],
  ['fl', 'Flevoland', '', 'Lelystad', '', 'The youngest province: it was land reclaimed from the sea in 1986.'],
  ['ge', 'Gelderland', 'Guelders', 'Arnhem', '', 'The biggest province by land area, with the Veluwe forest.'],
  ['ut', 'Utrecht', '', 'Utrecht', '', 'The smallest province, right in the middle of the country.'],
  ['nh', 'Noord-Holland', 'North Holland', 'Haarlem', '', 'Amsterdam is in this province, but its capital is Haarlem.'],
  ['zh', 'Zuid-Holland', 'South Holland', 'Den Haag', 'The Hague', 'The most people live here: Rotterdam, Den Haag and the tulip fields.'],
  ['ze', 'Zeeland', 'Zealand', 'Middelburg', '', 'Islands and the Delta Works. "Luctor et emergo": I struggle and emerge.'],
  ['nb', 'Noord-Brabant', 'North Brabant', "'s-Hertogenbosch", '', 'Den Bosch is the capital, but Eindhoven is the biggest city.'],
  ['li', 'Limburg', '', 'Maastricht', '', 'The hilly south, with its own accent and vlaai (pie).'],
].map(([id, name, en, cap, capEn, fact]) => ({ id, name, en: en || name, cap, capEn: capEn || cap, fact, nameAlt: [], capAlt: cap === "'s-Hertogenbosch" ? ['Den Bosch', 's-Hertogenbosch'] : [] }));

// ---------- the rest of the world ----------
// [iso code, Dutch name, English name, capital (Dutch), capital (English, '' if the same), region, { name: [other spellings], cap: [...] }]
const mkCountries = (rows, cont) => rows.map(([id, name, en, cap, capEn, region, alt]) => ({ id, name, en: en || name, cap, capEn: capEn || cap, region, cont, nameAlt: (alt && alt.name) || [], capAlt: (alt && alt.cap) || [], flag: (cls) => flagImg(id, cls) }));

const ASIA_REGIONS = [['mideast', 'Middle East'], ['central', 'Central Asia'], ['south', 'South Asia'], ['east', 'East Asia'], ['se', 'Southeast Asia']];
const ASIA = mkCountries([
  ['tr', 'Turkije', 'Turkey', 'Ankara', '', 'mideast'], ['ge', 'Georgië', 'Georgia', 'Tbilisi', '', 'mideast'], ['am', 'Armenië', 'Armenia', 'Jerevan', 'Yerevan', 'mideast'], ['az', 'Azerbeidzjan', 'Azerbaijan', 'Bakoe', 'Baku', 'mideast'],
  ['sy', 'Syrië', 'Syria', 'Damascus', '', 'mideast'], ['lb', 'Libanon', 'Lebanon', 'Beiroet', 'Beirut', 'mideast'], ['il', 'Israël', 'Israel', 'Jeruzalem', 'Jerusalem', 'mideast'], ['jo', 'Jordanië', 'Jordan', 'Amman', '', 'mideast'],
  ['iq', 'Irak', 'Iraq', 'Bagdad', 'Baghdad', 'mideast'], ['ir', 'Iran', 'Iran', 'Teheran', 'Tehran', 'mideast'], ['sa', 'Saoedi-Arabië', 'Saudi Arabia', 'Riyad', 'Riyadh', 'mideast', { name: ['Saudi-Arabië'] }], ['ye', 'Jemen', 'Yemen', 'Sanaa', '', 'mideast'],
  ['om', 'Oman', 'Oman', 'Muscat', '', 'mideast'], ['ae', 'Verenigde Arabische Emiraten', 'United Arab Emirates', 'Abu Dhabi', '', 'mideast', { name: ['VAE', 'Emiraten'] }], ['qa', 'Qatar', 'Qatar', 'Doha', '', 'mideast'],
  ['kw', 'Koeweit', 'Kuwait', 'Koeweit', 'Kuwait City', 'mideast', { cap: ['Koeweit-Stad'] }], ['bh', 'Bahrein', 'Bahrain', 'Manama', '', 'mideast'],
  ['kz', 'Kazachstan', 'Kazakhstan', 'Astana', '', 'central'], ['uz', 'Oezbekistan', 'Uzbekistan', 'Tasjkent', 'Tashkent', 'central'], ['tm', 'Turkmenistan', 'Turkmenistan', 'Asjchabad', 'Ashgabat', 'central'],
  ['kg', 'Kirgizië', 'Kyrgyzstan', 'Bisjkek', 'Bishkek', 'central'], ['tj', 'Tadzjikistan', 'Tajikistan', 'Doesjanbe', 'Dushanbe', 'central'], ['af', 'Afghanistan', 'Afghanistan', 'Kaboel', 'Kabul', 'central'],
  ['pk', 'Pakistan', 'Pakistan', 'Islamabad', '', 'south'], ['in', 'India', 'India', 'Nieuw-Delhi', 'New Delhi', 'south', { cap: ['Delhi'] }], ['np', 'Nepal', 'Nepal', 'Kathmandu', '', 'south', { cap: ['Katmandu'] }],
  ['bt', 'Bhutan', 'Bhutan', 'Thimphu', '', 'south'], ['bd', 'Bangladesh', 'Bangladesh', 'Dhaka', '', 'south'], ['lk', 'Sri Lanka', 'Sri Lanka', 'Colombo', '', 'south'], ['mv', 'Maldiven', 'Maldives', 'Malé', '', 'south'],
  ['cn', 'China', 'China', 'Peking', 'Beijing', 'east'], ['mn', 'Mongolië', 'Mongolia', 'Ulaanbaatar', '', 'east'], ['kp', 'Noord-Korea', 'North Korea', 'Pyongyang', '', 'east'], ['kr', 'Zuid-Korea', 'South Korea', 'Seoel', 'Seoul', 'east'],
  ['jp', 'Japan', 'Japan', 'Tokio', 'Tokyo', 'east'], ['tw', 'Taiwan', 'Taiwan', 'Taipei', '', 'east'],
  ['mm', 'Myanmar', 'Myanmar', 'Naypyidaw', '', 'se', { name: ['Birma'] }], ['th', 'Thailand', 'Thailand', 'Bangkok', '', 'se'], ['la', 'Laos', 'Laos', 'Vientiane', '', 'se'], ['kh', 'Cambodja', 'Cambodia', 'Phnom Penh', '', 'se', { name: ['Kambodja'] }],
  ['vn', 'Vietnam', 'Vietnam', 'Hanoi', '', 'se'], ['my', 'Maleisië', 'Malaysia', 'Kuala Lumpur', '', 'se'], ['sg', 'Singapore', 'Singapore', 'Singapore', '', 'se'], ['id', 'Indonesië', 'Indonesia', 'Jakarta', '', 'se', { cap: ['Djakarta'] }],
  ['bn', 'Brunei', 'Brunei', 'Bandar Seri Begawan', '', 'se'], ['ph', 'Filipijnen', 'Philippines', 'Manilla', 'Manila', 'se'], ['tl', 'Oost-Timor', 'East Timor', 'Dili', '', 'se', { name: ['Timor-Leste'] }],
], 'asia');

const AFRICA_REGIONS = [['north', 'North'], ['west', 'West'], ['central', 'Central'], ['east', 'East'], ['south', 'Southern']];
const AFRICA = mkCountries([
  ['ma', 'Marokko', 'Morocco', 'Rabat', '', 'north'], ['dz', 'Algerije', 'Algeria', 'Algiers', '', 'north'], ['tn', 'Tunesië', 'Tunisia', 'Tunis', '', 'north'], ['ly', 'Libië', 'Libya', 'Tripoli', '', 'north'], ['eg', 'Egypte', 'Egypt', 'Caïro', 'Cairo', 'north'],
  ['mr', 'Mauritanië', 'Mauritania', 'Nouakchott', '', 'west'], ['sn', 'Senegal', 'Senegal', 'Dakar', '', 'west'], ['gm', 'Gambia', 'The Gambia', 'Banjul', '', 'west'], ['gw', 'Guinee-Bissau', 'Guinea-Bissau', 'Bissau', '', 'west'], ['gn', 'Guinee', 'Guinea', 'Conakry', '', 'west'],
  ['sl', 'Sierra Leone', 'Sierra Leone', 'Freetown', '', 'west'], ['lr', 'Liberia', 'Liberia', 'Monrovia', '', 'west'], ['ci', 'Ivoorkust', 'Ivory Coast', 'Yamoussoukro', '', 'west'], ['gh', 'Ghana', 'Ghana', 'Accra', '', 'west'], ['tg', 'Togo', 'Togo', 'Lomé', '', 'west'],
  ['bj', 'Benin', 'Benin', 'Porto-Novo', '', 'west'], ['ng', 'Nigeria', 'Nigeria', 'Abuja', '', 'west'], ['ml', 'Mali', 'Mali', 'Bamako', '', 'west'], ['bf', 'Burkina Faso', 'Burkina Faso', 'Ouagadougou', '', 'west'], ['ne', 'Niger', 'Niger', 'Niamey', '', 'west'], ['cv', 'Kaapverdië', 'Cape Verde', 'Praia', '', 'west'],
  ['td', 'Tsjaad', 'Chad', "N'Djamena", '', 'central'], ['cm', 'Kameroen', 'Cameroon', 'Yaoundé', '', 'central'], ['cf', 'Centraal-Afrikaanse Republiek', 'Central African Republic', 'Bangui', '', 'central'], ['gq', 'Equatoriaal-Guinea', 'Equatorial Guinea', 'Malabo', '', 'central'],
  ['ga', 'Gabon', 'Gabon', 'Libreville', '', 'central'], ['cg', 'Congo-Brazzaville', 'Republic of the Congo', 'Brazzaville', '', 'central', { name: ['Republiek Congo'] }], ['cd', 'Congo-Kinshasa', 'DR Congo', 'Kinshasa', '', 'central', { name: ['Congo', 'Democratische Republiek Congo'] }],
  ['st', 'Sao Tomé en Principe', 'São Tomé and Príncipe', 'Sao Tomé', 'São Tomé', 'central'], ['ao', 'Angola', 'Angola', 'Luanda', '', 'central'],
  ['sd', 'Soedan', 'Sudan', 'Khartoem', 'Khartoum', 'east'], ['ss', 'Zuid-Soedan', 'South Sudan', 'Juba', '', 'east'], ['er', 'Eritrea', 'Eritrea', 'Asmara', '', 'east'], ['dj', 'Djibouti', 'Djibouti', 'Djibouti', '', 'east'], ['et', 'Ethiopië', 'Ethiopia', 'Addis Abeba', 'Addis Ababa', 'east'],
  ['so', 'Somalië', 'Somalia', 'Mogadishu', '', 'east'], ['ke', 'Kenia', 'Kenya', 'Nairobi', '', 'east'], ['ug', 'Oeganda', 'Uganda', 'Kampala', '', 'east'], ['rw', 'Rwanda', 'Rwanda', 'Kigali', '', 'east'], ['bi', 'Burundi', 'Burundi', 'Gitega', '', 'east'], ['tz', 'Tanzania', 'Tanzania', 'Dodoma', '', 'east'],
  ['zm', 'Zambia', 'Zambia', 'Lusaka', '', 'south'], ['mw', 'Malawi', 'Malawi', 'Lilongwe', '', 'south'], ['mz', 'Mozambique', 'Mozambique', 'Maputo', '', 'south'], ['zw', 'Zimbabwe', 'Zimbabwe', 'Harare', '', 'south'], ['na', 'Namibië', 'Namibia', 'Windhoek', '', 'south'],
  ['bw', 'Botswana', 'Botswana', 'Gaborone', '', 'south'], ['za', 'Zuid-Afrika', 'South Africa', 'Pretoria', '', 'south', { cap: ['Kaapstad', 'Bloemfontein'] }], ['ls', 'Lesotho', 'Lesotho', 'Maseru', '', 'south'], ['sz', 'Eswatini', 'Eswatini', 'Mbabane', '', 'south', { name: ['Swaziland'] }],
  ['mg', 'Madagaskar', 'Madagascar', 'Antananarivo', '', 'south'], ['mu', 'Mauritius', 'Mauritius', 'Port Louis', '', 'south'], ['sc', 'Seychellen', 'Seychelles', 'Victoria', '', 'south'], ['km', 'Comoren', 'Comoros', 'Moroni', '', 'south'],
], 'africa');

const NAMERICA_REGIONS = [['north', 'North'], ['central', 'Central America'], ['carib', 'Caribbean']];
const NAMERICA = mkCountries([
  ['ca', 'Canada', 'Canada', 'Ottawa', '', 'north'], ['us', 'Verenigde Staten', 'United States', 'Washington', 'Washington, D.C.', 'north', { name: ['Amerika', 'VS', 'Verenigde Staten van Amerika'], cap: ['Washington DC', 'Washington D.C.'] }], ['mx', 'Mexico', 'Mexico', 'Mexico-Stad', 'Mexico City', 'north', { cap: ['Mexico'] }],
  ['gt', 'Guatemala', 'Guatemala', 'Guatemala-Stad', 'Guatemala City', 'central', { cap: ['Guatemala'] }], ['bz', 'Belize', 'Belize', 'Belmopan', '', 'central'], ['sv', 'El Salvador', 'El Salvador', 'San Salvador', '', 'central'], ['hn', 'Honduras', 'Honduras', 'Tegucigalpa', '', 'central'],
  ['ni', 'Nicaragua', 'Nicaragua', 'Managua', '', 'central'], ['cr', 'Costa Rica', 'Costa Rica', 'San José', '', 'central'], ['pa', 'Panama', 'Panama', 'Panama-Stad', 'Panama City', 'central', { cap: ['Panama'] }],
  ['cu', 'Cuba', 'Cuba', 'Havana', '', 'carib'], ['jm', 'Jamaica', 'Jamaica', 'Kingston', '', 'carib'], ['ht', 'Haïti', 'Haiti', 'Port-au-Prince', '', 'carib'], ['do', 'Dominicaanse Republiek', 'Dominican Republic', 'Santo Domingo', '', 'carib'],
  ['bs', "Bahama's", 'The Bahamas', 'Nassau', '', 'carib', { name: ['Bahamas'] }], ['tt', 'Trinidad en Tobago', 'Trinidad and Tobago', 'Port of Spain', '', 'carib'], ['bb', 'Barbados', 'Barbados', 'Bridgetown', '', 'carib'], ['gd', 'Grenada', 'Grenada', "Saint George's", '', 'carib'],
  ['lc', 'Saint Lucia', 'Saint Lucia', 'Castries', '', 'carib'], ['vc', 'Saint Vincent en de Grenadines', 'Saint Vincent and the Grenadines', 'Kingstown', '', 'carib'], ['ag', 'Antigua en Barbuda', 'Antigua and Barbuda', "Saint John's", '', 'carib'],
  ['kn', 'Saint Kitts en Nevis', 'Saint Kitts and Nevis', 'Basseterre', '', 'carib'], ['dm', 'Dominica', 'Dominica', 'Roseau', '', 'carib'],
], 'namerica');
const SAMERICA = mkCountries([
  ['co', 'Colombia', 'Colombia', 'Bogotá', '', ''], ['ve', 'Venezuela', 'Venezuela', 'Caracas', '', ''], ['gy', 'Guyana', 'Guyana', 'Georgetown', '', ''], ['sr', 'Suriname', 'Suriname', 'Paramaribo', '', ''], ['br', 'Brazilië', 'Brazil', 'Brasília', '', '', { cap: ['Brasilia'] }],
  ['ec', 'Ecuador', 'Ecuador', 'Quito', '', ''], ['pe', 'Peru', 'Peru', 'Lima', '', ''], ['bo', 'Bolivia', 'Bolivia', 'Sucre', '', '', { cap: ['La Paz'] }], ['py', 'Paraguay', 'Paraguay', 'Asunción', '', ''], ['uy', 'Uruguay', 'Uruguay', 'Montevideo', '', ''],
  ['ar', 'Argentinië', 'Argentina', 'Buenos Aires', '', ''], ['cl', 'Chili', 'Chile', 'Santiago', '', ''],
], 'samerica');
SAMERICA.forEach((c) => { c.region = 'sa'; }); // so the flags of the Americas can be grouped
const AMERICAS = NAMERICA.concat(SAMERICA);
const AMERICAS_REGIONS = NAMERICA_REGIONS.concat([['sa', 'South America']]);

const OCEANIA_REGIONS = [['anz', 'Australia & New Zealand'], ['mel', 'Melanesia'], ['mic', 'Micronesia'], ['pol', 'Polynesia']];
const OCEANIA = mkCountries([
  ['au', 'Australië', 'Australia', 'Canberra', '', 'anz'], ['nz', 'Nieuw-Zeeland', 'New Zealand', 'Wellington', '', 'anz'],
  ['pg', 'Papoea-Nieuw-Guinea', 'Papua New Guinea', 'Port Moresby', '', 'mel', { name: ['Papua-Nieuw-Guinea'] }], ['fj', 'Fiji', 'Fiji', 'Suva', '', 'mel'], ['sb', 'Salomonseilanden', 'Solomon Islands', 'Honiara', '', 'mel'], ['vu', 'Vanuatu', 'Vanuatu', 'Port Vila', '', 'mel'],
  ['pw', 'Palau', 'Palau', 'Ngerulmud', '', 'mic'], ['fm', 'Micronesia', 'Micronesia', 'Palikir', '', 'mic'], ['mh', 'Marshalleilanden', 'Marshall Islands', 'Majuro', '', 'mic'], ['ki', 'Kiribati', 'Kiribati', 'Tarawa', '', 'mic'], ['nr', 'Nauru', 'Nauru', 'Yaren', '', 'mic'],
  ['tv', 'Tuvalu', 'Tuvalu', 'Funafuti', '', 'pol'], ['ws', 'Samoa', 'Samoa', 'Apia', '', 'pol'], ['to', 'Tonga', 'Tonga', "Nuku'alofa", '', 'pol'],
], 'oceania');

// the whole world as one list, grouped by continent (a copy of each country whose region is its continent)
const WORLD_REGIONS = [['europe', 'Europe'], ['asia', 'Asia'], ['africa', 'Africa'], ['namerica', 'North & Central America'], ['samerica', 'South America'], ['oceania', 'Oceania']];
const WORLD = [EUROPE, ASIA, AFRICA, NAMERICA, SAMERICA, OCEANIA].flatMap((list) => list.map((c) => Object.assign({}, c, { region: c.cont })));

// seas, rivers and mountains of Europe: no flags and no capitals; where they are drawn is in mapdata.js (built from the coordinates in scripts/build-maps.js)
const WATERS_REGIONS = [['sea', 'Seas'], ['river', 'Rivers'], ['mountain', 'Mountains']];
const WATERS = [
  ['noordzee', 'Noordzee', 'North Sea', 'sea', 'Between the Netherlands, Britain and Scandinavia.'], ['oostzee', 'Oostzee', 'Baltic Sea', 'sea', 'A nearly closed sea in the north, with little salt.'],
  ['middellandse-zee', 'Middellandse Zee', 'Mediterranean Sea', 'sea', 'The big sea between southern Europe and Africa.'], ['zwarte-zee', 'Zwarte Zee', 'Black Sea', 'sea', 'Lies east of Bulgaria and Romania.'],
  ['atlantische-oceaan', 'Atlantische Oceaan', 'Atlantic Ocean', 'sea', 'The ocean west of Europe.'], ['adriatische-zee', 'Adriatische Zee', 'Adriatic Sea', 'sea', 'Between Italy and the Balkans.'],
  ['egeische-zee', 'Egeïsche Zee', 'Aegean Sea', 'sea', 'Between Greece and Turkey, full of islands.'], ['noorse-zee', 'Noorse Zee', 'Norwegian Sea', 'sea', 'West of Norway.'],
  ['ierse-zee', 'Ierse Zee', 'Irish Sea', 'sea', 'Between Ireland and Great Britain.'], ['het-kanaal', 'Het Kanaal', 'English Channel', 'sea', 'Between England and France.'],
  ['golf-van-biskaje', 'Golf van Biskaje', 'Bay of Biscay', 'sea', 'West of France and north of Spain.'], ['botnische-golf', 'Botnische Golf', 'Gulf of Bothnia', 'sea', 'Between Sweden and Finland.'],
  ['ionische-zee', 'Ionische Zee', 'Ionian Sea', 'sea', 'Between southern Italy and Greece.'], ['tyrreense-zee', 'Tyrreense Zee', 'Tyrrhenian Sea', 'sea', 'West of Italy, around Sardinia and Corsica.'],
  ['rijn', 'Rijn', 'Rhine', 'river', 'From the Alps through Germany to the Netherlands and the North Sea.'], ['donau', 'Donau', 'Danube', 'river', 'Flows through ten countries to the Black Sea.'],
  ['elbe', 'Elbe', 'Elbe', 'river', 'From Czechia through Germany to the North Sea at Hamburg.'], ['seine', 'Seine', 'Seine', 'river', 'Flows through Paris to the Channel.'],
  ['loire', 'Loire', 'Loire', 'river', 'The longest river in France.'], ['rhone', 'Rhône', 'Rhône', 'river', 'From Switzerland through southern France to the Mediterranean.'],
  ['po', 'Po', 'Po', 'river', 'The big river of northern Italy.'], ['wisla', 'Wisla', 'Vistula', 'river', 'Poland’s longest river, past Kraków and Warsaw. In Dutch also Weichsel.'],
  ['oder', 'Oder', 'Oder', 'river', 'Part of the border between Germany and Poland.'], ['theems', 'Theems', 'Thames', 'river', 'Flows through London.'],
  ['ebro', 'Ebro', 'Ebro', 'river', 'The longest river in Spain that ends in the Mediterranean.'], ['garonne', 'Garonne', 'Garonne', 'river', 'From the Pyrenees past Bordeaux.'],
  ['alpen', 'Alpen', 'Alps', 'mountain', 'The highest mountains in western Europe, up to 4,806 m (Mont Blanc).'], ['pyreneeen', 'Pyreneeën', 'Pyrenees', 'mountain', 'The border between France and Spain.'],
  ['karpaten', 'Karpaten', 'Carpathians', 'mountain', 'A long curve through Slovakia, Poland, Ukraine and Romania.'], ['apennijnen', 'Apennijnen', 'Apennines', 'mountain', 'The mountain spine of Italy.'],
  ['scandinavisch-gebergte', 'Scandinavisch Gebergte', 'Scandinavian Mountains', 'mountain', 'Between Norway and Sweden.'], ['dinarische-alpen', 'Dinarische Alpen', 'Dinaric Alps', 'mountain', 'Along the Adriatic coast of the Balkans.'],
  ['balkangebergte', 'Balkangebergte', 'Balkan Mountains', 'mountain', 'Across Bulgaria; they gave the Balkans their name.'], ['ardennen', 'Ardennen', 'Ardennes', 'mountain', 'Hills in Belgium, Luxembourg and France.'],
  ['zwarte-woud', 'Zwarte Woud', 'Black Forest', 'mountain', 'A wooded mountain area in south-west Germany.'], ['harz', 'Harz', 'Harz', 'mountain', 'A low mountain range in central Germany.'],
  ['etna', 'Etna', 'Mount Etna', 'mountain', 'An active volcano on Sicily.'], ['vesuvius', 'Vesuvius', 'Mount Vesuvius', 'mountain', 'The volcano near Naples that buried Pompeii.'],
  ['hekla', 'Hekla', 'Hekla', 'mountain', 'A volcano on IJsland.'],
].map(([id, name, en, region, fact]) => ({ id, name, en, region, fact, cap: '', capEn: '', nameAlt: [], capAlt: [] }));

// ---------- quiz rules (pure, tested) ----------
const geoNorm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function geoLev(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[b.length];
}
// field is 'name' (the country or province) or 'cap' (its capital). Accents and capitals do not matter.
// right | close (a typo) | english (you typed the English name) | wrong
function geoJudge(typed, item, field) {
  const t = geoNorm(typed); if (!t) return 'wrong';
  const want = [item[field], ...(item[field + 'Alt'] || [])].map(geoNorm).filter(Boolean);
  if (want.includes(t)) return 'right';
  const en = geoNorm(field === 'name' ? item.en : item.capEn);
  if (en && t === en) return 'english';
  if (want.some((w) => w.length > 4 && geoLev(t, w) <= 1)) return 'close';
  return 'wrong';
}
// how well an item is known, from its tally { c: right answers, m: misses }
function geoLevel(rec) {
  const c = (rec && rec.c) || 0, m = (rec && rec.m) || 0, n = c - m;
  return !c && !m ? 'new' : n >= 4 ? 'mastered' : n >= 2 ? 'known' : 'learning';
}
// the n items to ask about: the ones you know least come first (new ones count as zero), with a little shuffling so rounds differ
function geoPickQueue(items, stats, n, rnd) {
  rnd = rnd || Math.random;
  const score = (it) => { const r = (stats && stats[it.id]) || {}; return (r.c || 0) - 2 * (r.m || 0) + rnd() * 2.5; };
  return items.map((it) => [score(it), it]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
}
// the right item plus three look-alikes: from the same part of the continent (or the same kind of thing) when possible, the rest from anywhere; no two options with the same text
function geoOptions(items, item, key, count, rnd) {
  rnd = rnd || Math.random; count = count || 4;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const seen = new Set([key(item)]), out = [];
  const others = shuffle(items.filter((x) => x.id !== item.id)), near = others.filter((x) => item.region && x.region === item.region);
  for (const x of near.concat(others)) { if (out.length >= count - 1) break; if (!seen.has(key(x))) { seen.add(key(x)); out.push(x); } }
  return shuffle(out.concat(item));
}

if (typeof module !== 'undefined' && module.exports) module.exports = { EUROPE, EUROPE_REGIONS, PROVINCES, flagImg, ASIA, ASIA_REGIONS, AFRICA, AFRICA_REGIONS, NAMERICA, NAMERICA_REGIONS, SAMERICA, AMERICAS, AMERICAS_REGIONS, WORLD, WORLD_REGIONS, OCEANIA, OCEANIA_REGIONS, WATERS, WATERS_REGIONS, geoJudge, geoLevel, geoPickQueue, geoOptions };
