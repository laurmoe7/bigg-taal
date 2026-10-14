// Starter content. Words are copied into the user's data on first run; the rest is read-only reference.
const SEED_WORDS = `
de afspraak = appointment | Ik heb morgen een afspraak met de dokter.
de buurman = neighbour (male) | Mijn buurman is erg vriendelijk.
het bedrijf = company | Hij werkt bij een groot bedrijf.
de gemeente = municipality | Ik moet naar de gemeente voor mijn paspoort.
het gesprek = conversation | We hadden een lang gesprek.
de ervaring = experience | Heb je ervaring met dit werk?
het probleem = problem | Er is een probleem met mijn computer.
de vergadering = meeting | De vergadering begint om negen uur.
de verzekering = insurance | Mijn verzekering betaalt de reparatie.
de huur = rent | De huur moet voor de eerste betaald worden.
het formulier = form | Ik moet dit formulier invullen.
de oplossing = solution | We zoeken een oplossing voor het probleem.
het besluit = decision | Het besluit is gisteren genomen.
de mening = opinion | Wat is jouw mening over dit plan?
het onderwerp = topic | Het onderwerp van de les is wonen.
de reden = reason | Wat is de reden van je late komst?
het verschil = difference | Ik zie geen verschil tussen deze twee foto's.
de gewoonte = habit | Het is een slechte gewoonte om laat op te staan.
het ziekenhuis = hospital | Hij ligt al een week in het ziekenhuis.
de huisarts = GP, family doctor | Ik bel de huisarts voor een afspraak.
de apotheek = pharmacy | De apotheek is open tot zes uur.
het recept = prescription; recipe | De dokter geeft me een recept.
de klacht = complaint | Ik wil een klacht indienen.
de rekening = bill, invoice | Kan ik de rekening krijgen, alstublieft?
het loon = wage, salary | Het loon wordt aan het eind van de maand betaald.
de sollicitatie = job application | Mijn sollicitatie is vandaag verstuurd.
de ontwikkeling = development | De ontwikkeling van de stad gaat snel.
de overheid = government | De overheid verhoogt de belasting.
de belasting = tax | Ik moet mijn belasting betalen.
het bericht = message | Ik heb een bericht van mijn baas gekregen.
de uitnodiging = invitation | Bedankt voor de uitnodiging!
het medicijn = medicine | Neem dit medicijn twee keer per dag.
het openbaar vervoer = public transport | Ik ga met het openbaar vervoer naar mijn werk.
de vertraging = delay | De trein heeft twintig minuten vertraging.
de storing = disruption, fault | Er is een storing op het spoor.
de buurt = neighbourhood | Ik woon in een rustige buurt.
het contract = contract | Ik teken het contract morgen.
de collega = colleague | Mijn collega helpt me met de taak.
afspreken = to arrange, agree | We spreken om drie uur af.
uitleggen = to explain | Kun je dat nog een keer uitleggen?
vergelijken = to compare | Ik vergelijk de prijzen van de winkels.
besluiten = to decide | Ze besluiten om te verhuizen.
verwachten = to expect | Ik verwacht dat het morgen regent.
voorstellen = to propose; to introduce | Mag ik mezelf voorstellen?
ontvangen = to receive | Ik heb je brief ontvangen.
bestellen = to order | Wij bestellen twee koffie.
annuleren = to cancel | Ik moet mijn afspraak annuleren.
verhuizen = to move (house) | Volgend jaar verhuizen we naar Utrecht.
solliciteren = to apply for a job | Ik ga solliciteren bij dat bedrijf.
controleren = to check | Controleer je gegevens voordat je verstuurt.
ontdekken = to discover | Hij ontdekte een fout in het rapport.
bedoelen = to mean | Wat bedoel je daarmee?
herinneren = to remind; (zich) to remember | Ik herinner me die dag nog goed.
zich afvragen = to wonder | Ik vraag me af of hij komt.
aanmelden = to register, sign up | Je moet je eerst aanmelden voor de cursus.
opzeggen = to cancel (a subscription) | Ik zeg mijn abonnement op.
doorgeven = to pass on | Kun je dit aan Peter doorgeven?
meenemen = to take along | Vergeet je paraplu niet mee te nemen.
eigenlijk = actually | Eigenlijk wil ik liever thuisblijven.
daarom = that is why, therefore | Het regent, daarom blijf ik thuis.
hoewel = although | Hoewel het koud is, gaan we wandelen.
omdat = because | Ik blijf thuis omdat ik ziek ben.
tenzij = unless | We gaan morgen, tenzij het regent.
bovendien = moreover, besides | Het is goedkoop en bovendien erg lekker.
tegenwoordig = nowadays | Tegenwoordig werken veel mensen thuis.
meestal = usually | Meestal eet ik om zes uur.
vooral = especially | Ik hou vooral van Nederlandse kaas.
ongeveer = approximately | De reis duurt ongeveer twee uur.
helaas = unfortunately | Helaas kan ik niet komen.
namelijk = namely, you see | Ik kan niet komen, ik ben namelijk ziek.
trouwens = by the way | Trouwens, heb je mijn bericht gezien?
uiteindelijk = in the end | Uiteindelijk hebben we een oplossing gevonden.
natuurlijk = of course | Natuurlijk help ik je!
zeker = certain(ly) | Ik weet het zeker.
behalve = except, besides | Iedereen is er, behalve Anna.
gelukkig = fortunately; happy | Gelukkig was niemand gewond.
`;

// Cheat sheets for the Grammar page.
const GRAMMAR = [
  { t: 'De or het?', b: [
    'No perfect rule, but these help: <b>het</b> for diminutives (-je: het huisje), words for metals, languages, most words with <i>ge-</i> (het gesprek), -ment, -sel.',
    '<b>de</b> for -heid, -ing, -tie, -ij, -iek, people (de buurman), most plural nouns (always <i>de</i> in plural).',
    'About 3 in 4 Dutch nouns are <i>de</i>. When you learn a noun, always learn it with its article.' ] },
  { t: 'Word order: main clause', b: [
    'The conjugated verb is always in <b>second position</b>.',
    'Ik <u>ga</u> morgen naar de dokter. → Morgen <u>ga</u> ik naar de dokter. (Inversion: the verb stays second.)',
    'Second verb parts go to the end: Ik <u>heb</u> gisteren een brief <u>geschreven</u>. / Ik <u>wil</u> morgen <u>werken</u>.' ] },
  { t: 'Word order: omdat, dat, hoewel, als... (bijzin)', b: [
    'After these words the conjugated verb goes to the <b>end</b>.',
    'Ik blijf thuis, omdat ik ziek <u>ben</u>. · Hij zegt dat hij morgen <u>komt</u>. · Hoewel het regent, <u>gaan</u> we wandelen. (Clause first: verb-subject order in the main clause after the comma.)',
    'With two verbs at the end: ...omdat ik niet <u>kan komen</u> / ...omdat hij het <u>heeft gedaan</u>.' ] },
  { t: 'Separable verbs (scheidbare werkwoorden)', b: [
    'Main clause: the prefix goes to the end. <i>opbellen</i>: Ik <u>bel</u> je morgen <u>op</u>.',
    'Clause with omdat: stays together: ...omdat ik je morgen <u>opbel</u>.',
    'Perfect: <i>op</i> + <i>ge</i> + stem: ik heb opgebeld. Infinitive with te: <i>op te bellen</i>.' ] },
  { t: 'Perfect tense (voltooid tegenwoordige tijd)', b: [
    'hebben/zijn + past participle. Most verbs use <b>hebben</b>; verbs of movement or change of state use <b>zijn</b> (gaan, komen, blijven, worden, vallen, verhuizen).',
    'Regular: ge- + stem + t/d. werken → gewerkt. Use the \'t kofschip rule: if the stem ends in t, k, f, s, ch, p → <b>-t</b>, otherwise <b>-d</b>.',
    'No ge- when the verb starts with be-, ge-, her-, ont-, ver-: bestellen → besteld.' ] },
  { t: 'Imperfectum (simple past)', b: [
    'Regular verbs: stem + <b>-te/-ten</b> or <b>-de/-den</b> (\'t kofschip again). Ik werkte, wij werkten. Ik woonde, wij woonden.',
    'Strong verbs change vowel: ik ging, wij gingen · ik zag, wij zagen. These must be memorised: see the Verbs worksheet.' ] },
  { t: 'er', b: [
    '<b>er</b> = there (place): Ik ga er morgen heen. · = quantity: Ik heb er twee. · = with indefinite subject: Er is een probleem.',
    'With a preposition, "er + preposition" replaces "preposition + it": Ik wacht erop. (= I am waiting for it.)' ] },
  { t: 'Useful B1 connectors', b: [
    'omdat (because) · doordat · aangezien · daarom (therefore, main-clause order: Daarom ga ik) · toch (still) · echter (however) · bovendien (besides) · hoewel (although) · terwijl (while) · zodat (so that) · voordat / nadat (before / after)',
    'Sequencing: eerst, daarna, vervolgens, tenslotte.' ] },
];

const PROVERBS = [
  ['Oefening baart kunst.', 'Practice makes perfect.'],
  ['Een goed begin is het halve werk.', 'A good start is half the work.'],
  ['Stap voor stap komt men ver.', 'Step by step you get far.'],
  ['Al doende leert men.', 'You learn by doing.'],
  ['Beter laat dan nooit.', 'Better late than never.'],
  ['Wie niet waagt, die niet wint.', 'Nothing ventured, nothing gained.'],
  ['De appel valt niet ver van de boom.', 'The apple does not fall far from the tree.'],
  ['Geen ei zonder dooier.', 'No egg without a yolk. (Nothing is perfect.)'],
  ['Na regen komt zonneschijn.', 'After rain comes sunshine.'],
  ['Het zit in een klein hoekje.', 'It is in a small corner. (It is a small thing.)'],
  ['Doe maar gewoon, dan doe je al gek genoeg.', 'Just act normal, that is crazy enough.'],
  ['Ik ben er helemaal klaar mee!', 'I am completely done with it!'],
];

// Bigg's lines. He is Varken's little brother: sweet, cheery, always kind. {n} = number, {s} = streak, {t} = title
const PIG = {
  welcome: ["Hoi! I am Bigg, Varken's little brother! Let us learn Dutch together! 🌸", 'Welkom! Add a few words and we can start. I am so excited! ✨', 'Hoi! Add a few words and I will help you remember them. 🌱', 'A fresh start! Let us collect some Dutch words together. ✨'],
  due: ['{n} cards are ready, and I think you are going to do wonderfully! 💗', 'Yay, {n} cards! Just a few minutes is perfect. 🌸', 'Every card you review makes my little plant grow. {n} to go! 🌱', 'I saved {n} cards for you. We can do this together! ✨', '{n} cards are waiting for you. Shall we? 🌸', 'Psst, {n} cards want to say hoi! 👋', 'A little practice now means less to remember later. {n} cards! ✨', 'Ready when you are! {n} cards, no rush. 🌱', '{n} cards today. I will cheer for every single one! 🎉', 'Small steps, big progress. Let us do these {n}! 🐾', 'Your brain is going to love these {n} cards. 🧠'],
  nothingDue: ['All caught up! You are amazing. Maybe a little listening for fun? 🎧', 'Nothing due right now. How about a worksheet? Or a rest, you earned it! 💗', 'You are all done for now. I am so proud of you! 🌸', 'Nothing is due, so everything from here on is a bonus! ✨', 'Mooi, all clear! Want to try the Bonus Lessons? 🌍', 'You are up to date! Maybe listen to a few sentences? 🎧', 'Rest day for the cards. A quick flag quiz, perhaps? 🚩', 'All done here. Fancy some blank-page recall? 📝'],
  goal: ['You reached your goal! I am doing a happy wiggle! 🎉', 'Goed gedaan! That is today done, and anything extra is a lovely bonus. 💗', 'Wheee! Daily goal complete! Varken will be so proud of you! ✨', 'Daily goal done! You can stop now, or keep going for fun. 🌟', 'Hoera! Goal reached. I am doing a little spin! 🌀', 'Dat is een mooie dag! Goal complete! 🌸', 'Look at you, hitting your goal again! ✨'],
  level: ['You are level {n}! Look how far you have come! 🌟', '{x} XP to level {m}. You can do it! 💗', 'Level {n} already? I am so proud of you! ✨', 'My plant is blooming because of you, level {n}! 🌼', 'Level {n} looks good on you! 🌟', 'Only {x} XP until level {m}! Almost there! 🚀', 'Every card adds a little XP. You are at level {n}! 🌱', 'Level {n}, and still growing! 🌼'],
  night: ['It is late. Sweet dreams, we will learn more tomorrow! 🌙', 'Zzz.. you did lovely today. Sleep well! 💤', 'Slaap lekker! The words will still be here tomorrow. 🌙', 'Late-night learning? Mooi, but sleep helps memory too! 💤', 'Shh, the stars are out. Maybe one more card, then bed? ⭐', 'Even Bigg needs his beauty sleep. Welterusten! 😴'],
  right: ['Goed zo!', 'Precies! 🌸', 'Yay, you got it!', 'Lekker bezig!', 'Wonderful!', 'Super!', 'Heel goed!', 'Klopt!', 'Mooi zo!', 'Dat is correct! ✨', 'Nailed it!', 'Top!'],
  close: ['So close! You almost had it! 💗', 'Nearly perfect, just a tiny spelling thing!', 'Bijna! Great try!', 'Just one little slip, you know it! 🌸', 'So near! Check the spelling once more.', 'Haast goed! Almost there!'],
  wrong: ['That is okay, every try helps you remember! 💗', 'No worries! Now it will stick even better. 🌸', 'You are learning, and that is what counts!', 'Niet erg! We will see it again soon.', 'Oeps! That is how we learn. 🌱', 'Een foutje, geen ramp! 🌸', 'It will click soon, I promise! ✨', 'Mistakes are tiny teachers. 🐷'],
  poke: ['Hehe, that tickles! 💗', 'Oink-oink! Hoi!', 'Varken says hi from the other room!', 'You are doing so well!', 'Bigg believes in you! 🌸', 'Yay yay yay!', 'Spreek je Nederlands? Een beetje? You are great at it! ✨', 'Big hug! 🤗', 'Oink! That was my favourite spot. 🐽', 'You found me! Hoi hoi! 🌸', 'Did you know Dutch has the word "gezellig"? Nothing else quite like it! ✨', 'Hihi! Again, again! 🎉', 'I was just thinking about stroopwafels. 🧇', 'Een, twee, drie... oink! 🎶', 'Keep going, you are closer than you think! 🌟', 'Tiny pig, big cheering. Doei doei! 👋'],
};

// Extra things Bigg says on Today: by time of day, weekend, Monday, little Dutch tips and facts, the Bonus Lessons, and by name once you have given yours.
PIG.morning = ['Goedemorgen! A few cards with your coffee? ☕', 'Good morning! Fresh brain, perfect time for new words. 🌅', 'Goedemorgen! The day is young. 🌸'];
PIG.afternoon = ['Goedemiddag! Time for a little Dutch break? 🌿', 'Good afternoon! A few cards will wake you right up. ✨', 'Hoi! Afternoon slump? A quick quiz helps! ☀️'];
PIG.evening = ['Goedenavond! A calm round of cards before dinner? 🍽️', 'Good evening! Let us wrap up the day with some Dutch. 🌆', 'Goedenavond! Your words are ready for you. 🌙'];
PIG.weekend = ['Fijn weekend! No pressure, just a little fun with Dutch. 🌈', 'It is the weekend! Even five minutes counts. 🌸', 'Weekend mode: relaxed learning only! 🛋️'];
PIG.monday = ['Goede maandag! A fresh week, a fresh start. 🌱', 'Monday! Your weekly recap is waiting on this page. 📅'];
PIG.tips = ['Tip: say new words out loud. Press the speaker and copy me! 🔊', 'Tip: "de" and "het" have to be learned with each noun, so always learn them together. 🏷️', 'Tip: Dutch word order puts the verb in second place: "Vandaag eet ik soep." 🍲',
  'Tip: the Dutch "g" is made at the back of your throat. Try saying "goed"! 🗣️', 'Fun fact: "oei" is a very Dutch way to say oops. 🙈', 'Fun fact: Dutch has diminutives: huis becomes huisje, and everything gets cuter. 🏡',
  'Fun fact: about 25 million people speak Dutch, in the Netherlands, Belgium and Suriname. 🌍', 'Tip: little and often beats long and rarely. Five minutes a day is great! ⏱️', 'Fun fact: "gezellig" has no exact English word. It means cozy, friendly and together. 🕯️',
  'Tip: try Blank-page recall on the Words page to find what you really remember. 📝', 'Tip: words you miss come back more often. That is the system helping you! 🔁', 'Fun fact: the Dutch eat "hagelslag", chocolate sprinkles, on bread for breakfast! 🍫'];
PIG.bonus = ['Have you tried the Bonus Lessons? Maps, capitals and flags! 🗺️', 'Quick flag quiz? I will go easy on you. 🚩', 'Do you know all the Dutch provinces? Let us find out! 🌷', 'The world has 195 countries. How many can you name in Dutch? 🌍', 'The Bonus Lessons have seas, rivers and mountains too. 🌊'];
PIG.named = ['Hoi {name}! Fijn dat je er bent! 🌸', '{name}, you are doing great! ✨', 'Goed bezig, {name}! 🎉', 'Ready when you are, {name}! 🌱', '{name}, I saved you a seat. Let us learn! 🐷'];

// What Bigg says while you go through flashcards. One list per moment (see L.coachMoment).
const COACH = {
  start: ['Here we go! You have got this! 🌸', 'Ready? I will cheer for every card! ✨', 'Let us do this together! 💗', 'Take your time, I am right here! 🌱', 'Fijn dat je er bent! Let us begin. 🌸', 'Deep breath, and off we go! ✨'],
  right: ['Yay, goed zo! 🌸', 'Wonderful!', 'That one is yours now! ✨', 'Nice one! 💗', 'You remembered it!', 'Look at you go! 🌟', 'Precies!', 'Heel goed! 🌸', 'Klopt precies!', 'You are on a roll! 🎉', 'Mooi zo!'],
  again: ['That is okay, it will come back soon. 💗', 'No worries, we will see it again!', 'Every try helps it stick. 🌱', 'You are doing great, keep going!', 'Mistakes are how it sticks. 🌸', 'Oeps, that one is tricky. It will come back! 🌱', 'A good miss! Now it will stay. 🐷', 'Niet erg, next one! 🌸'],
  streak3: ['Three in a row! ⭐', 'Three right, you are warming up! 🔥', 'Drie op een rij! ⭐'],
  streak5: ['Five in a row! You are on fire! 🔥', 'Five! I am doing a spin for you! ✨', 'Vijf op een rij! Wat een held! 🔥'],
  streak8: ['Eight in a row?! Amazing! 🎉', 'A whole streak! I am so proud of you! 💗'],
  half: ['Halfway there! 🌟', 'Half done, you are flying! ✨', 'Over halfway! Doorgaan! 🌟'],
  last: ['Last card! Finish strong! 💪', 'One more and you are done! 🌸', 'Nog eentje! 🌸'],
  done: ['All done! I am so proud of you! 🎉', 'Klaar! You did so well today! 💗', 'Goed gedaan! Time for a little rest. 🌸', 'Dat was het! Doe je goed. 🌼', 'Klaar! Take a sip of water, you earned it. 💧'],
};

// Two phrases and two words show up on Today each day (chosen from the date, so they change every morning).
const DAILY_PHRASES = [
  ['Hoe gaat het met je?', 'How are you?'], ['Kun je dat nog een keer zeggen?', 'Can you say that again?'], ['Ik begrijp het niet helemaal.', 'I do not completely understand.'],
  ['Mag ik even iets vragen?', 'May I ask something quickly?'], ['Wat vind je ervan?', 'What do you think of it?'], ['Dat maakt niet uit.', 'That does not matter.'],
  ['Ik ben er bijna.', 'I am almost there.'], ['Laten we een afspraak maken.', 'Let us make an appointment.'], ['Ik heb er zin in!', 'I am looking forward to it!'],
  ['Dat klinkt goed.', 'That sounds good.'], ['Het spijt me van de vertraging.', 'I am sorry about the delay.'], ['Ik kom zo bij je terug.', 'I will get back to you shortly.'],
  ['Wil je het iets langzamer zeggen?', 'Could you say it a bit slower?'], ['Heb je een momentje?', 'Do you have a moment?'], ['Dat hangt ervan af.', 'That depends.'],
  ['Ik ben het met je eens.', 'I agree with you.'], ['Ik twijfel nog.', 'I am still undecided.'], ['Het is niet erg.', 'It is not a big deal.'],
  ['Succes met je werk!', 'Good luck with your work!'], ['Tot later!', 'See you later!'], ['Mag ik de rekening, alsjeblieft?', 'Could I have the bill, please?'],
  ['Waar kan ik dit vinden?', 'Where can I find this?'], ['Ik zoek een nieuwe woning.', 'I am looking for a new home.'], ['Hoe laat begint het?', 'What time does it start?'],
  ['Wat is er aan de hand?', 'What is going on?'], ['Het regent al de hele dag.', 'It has been raining all day.'], ['Dat is een goed idee.', 'That is a good idea.'],
  ['Neem de tijd.', 'Take your time.'], ['Ik moet even nadenken.', 'I need to think for a moment.'], ['Alles komt goed.', 'Everything will be fine.'],
];
const DAILY_WORDS = [
  ['de gezelligheid', 'coziness, a nice atmosphere'], ['de afspraak', 'appointment'], ['het gesprek', 'conversation'], ['de ervaring', 'experience'], ['de bedoeling', 'intention, purpose'],
  ['vervelend', 'annoying'], ['eigenlijk', 'actually'], ['misschien', 'maybe'], ['bijvoorbeeld', 'for example'], ['daarom', 'that is why'], ['ondertussen', 'meanwhile'],
  ['de buurt', 'neighbourhood'], ['de gewoonte', 'habit'], ['het gevoel', 'feeling'], ['de keuze', 'choice'], ['het verschil', 'difference'], ['de oplossing', 'solution'],
  ['meestal', 'usually'], ['vooral', 'especially'], ['gelukkig', 'fortunately, happy'], ['de verrassing', 'surprise'], ['het verhaal', 'story'], ['de reis', 'journey'],
  ['de herinnering', 'memory'], ['ontmoeten', 'to meet'], ['begrijpen', 'to understand'], ['herinneren', 'to remember'], ['uitleggen', 'to explain'], ['zich verheugen', 'to look forward'],
  ['het voordeel', 'advantage'], ['het nadeel', 'disadvantage'], ['verwachten', 'to expect'],
];

// English for the starter example sentences (shown on the flashcard back; the saved words only keep the Dutch)
const SEED_EN = {
"Ik heb morgen een afspraak met de dokter.": "I have an appointment with the doctor tomorrow.",
"Mijn buurman is erg vriendelijk.": "My neighbour is very friendly.",
"Hij werkt bij een groot bedrijf.": "He works at a big company.",
"Ik moet naar de gemeente voor mijn paspoort.": "I have to go to the town hall for my passport.",
"We hadden een lang gesprek.": "We had a long conversation.",
"Heb je ervaring met dit werk?": "Do you have experience with this work?",
"Er is een probleem met mijn computer.": "There is a problem with my computer.",
"De vergadering begint om negen uur.": "The meeting starts at nine o'clock.",
"Mijn verzekering betaalt de reparatie.": "My insurance pays for the repair.",
"De huur moet voor de eerste betaald worden.": "The rent has to be paid before the first.",
"Ik moet dit formulier invullen.": "I have to fill in this form.",
"We zoeken een oplossing voor het probleem.": "We are looking for a solution to the problem.",
"Het besluit is gisteren genomen.": "The decision was made yesterday.",
"Wat is jouw mening over dit plan?": "What is your opinion about this plan?",
"Het onderwerp van de les is wonen.": "The topic of the lesson is housing.",
"Wat is de reden van je late komst?": "What is the reason for your late arrival?",
"Ik zie geen verschil tussen deze twee foto's.": "I see no difference between these two photos.",
"Het is een slechte gewoonte om laat op te staan.": "It is a bad habit to get up late.",
"Hij ligt al een week in het ziekenhuis.": "He has been in the hospital for a week.",
"Ik bel de huisarts voor een afspraak.": "I am calling the family doctor for an appointment.",
"De apotheek is open tot zes uur.": "The pharmacy is open until six o'clock.",
"De dokter geeft me een recept.": "The doctor is giving me a prescription.",
"Ik wil een klacht indienen.": "I want to file a complaint.",
"Kan ik de rekening krijgen, alstublieft?": "Can I have the bill, please?",
"Het loon wordt aan het eind van de maand betaald.": "The wages are paid at the end of the month.",
"Mijn sollicitatie is vandaag verstuurd.": "My job application was sent today.",
"De ontwikkeling van de stad gaat snel.": "The development of the city is going fast.",
"De overheid verhoogt de belasting.": "The government is raising the tax.",
"Ik moet mijn belasting betalen.": "I have to pay my tax.",
"Ik heb een bericht van mijn baas gekregen.": "I received a message from my boss.",
"Bedankt voor de uitnodiging!": "Thank you for the invitation!",
"Neem dit medicijn twee keer per dag.": "Take this medicine twice a day.",
"Ik ga met het openbaar vervoer naar mijn werk.": "I go to work by public transport.",
"De trein heeft twintig minuten vertraging.": "The train is twenty minutes late.",
"Er is een storing op het spoor.": "There is a disruption on the track.",
"Ik woon in een rustige buurt.": "I live in a quiet neighbourhood.",
"Ik teken het contract morgen.": "I will sign the contract tomorrow.",
"Mijn collega helpt me met de taak.": "My colleague is helping me with the task.",
"We spreken om drie uur af.": "We are meeting at three o'clock.",
"Kun je dat nog een keer uitleggen?": "Can you explain that once more?",
"Ik vergelijk de prijzen van de winkels.": "I am comparing the prices of the shops.",
"Ze besluiten om te verhuizen.": "They decide to move.",
"Ik verwacht dat het morgen regent.": "I expect it to rain tomorrow.",
"Mag ik mezelf voorstellen?": "May I introduce myself?",
"Ik heb je brief ontvangen.": "I received your letter.",
"Wij bestellen twee koffie.": "We are ordering two coffees.",
"Ik moet mijn afspraak annuleren.": "I have to cancel my appointment.",
"Volgend jaar verhuizen we naar Utrecht.": "Next year we are moving to Utrecht.",
"Ik ga solliciteren bij dat bedrijf.": "I am going to apply at that company.",
"Controleer je gegevens voordat je verstuurt.": "Check your details before you send.",
"Hij ontdekte een fout in het rapport.": "He discovered a mistake in the report.",
"Wat bedoel je daarmee?": "What do you mean by that?",
"Ik herinner me die dag nog goed.": "I still remember that day well.",
"Ik vraag me af of hij komt.": "I wonder whether he is coming.",
"Je moet je eerst aanmelden voor de cursus.": "You have to sign up for the course first.",
"Ik zeg mijn abonnement op.": "I am cancelling my subscription.",
"Kun je dit aan Peter doorgeven?": "Can you pass this on to Peter?",
"Vergeet je paraplu niet mee te nemen.": "Don't forget to take your umbrella.",
"Eigenlijk wil ik liever thuisblijven.": "Actually, I would rather stay home.",
"Het regent, daarom blijf ik thuis.": "It is raining, so I am staying home.",
"Hoewel het koud is, gaan we wandelen.": "Although it is cold, we are going for a walk.",
"Ik blijf thuis omdat ik ziek ben.": "I am staying home because I am ill.",
"We gaan morgen, tenzij het regent.": "We are going tomorrow, unless it rains.",
"Het is goedkoop en bovendien erg lekker.": "It is cheap and, what is more, very tasty.",
"Tegenwoordig werken veel mensen thuis.": "Nowadays many people work from home.",
"Meestal eet ik om zes uur.": "Usually I eat at six o'clock.",
"Ik hou vooral van Nederlandse kaas.": "I especially love Dutch cheese.",
"De reis duurt ongeveer twee uur.": "The journey takes about two hours.",
"Helaas kan ik niet komen.": "Unfortunately I cannot come.",
"Ik kan niet komen, ik ben namelijk ziek.": "I cannot come, because I am ill.",
"Trouwens, heb je mijn bericht gezien?": "By the way, did you see my message?",
"Uiteindelijk hebben we een oplossing gevonden.": "In the end we found a solution.",
"Natuurlijk help ik je!": "Of course I will help you!",
"Ik weet het zeker.": "I am sure.",
"Iedereen is er, behalve Anna.": "Everyone is there, except Anna.",
"Gelukkig was niemand gewond.": "Fortunately nobody was hurt."
};
