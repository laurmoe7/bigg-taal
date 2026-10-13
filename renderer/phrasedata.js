// Phrasebook for the Phrases tab: everyday sentences you actually say, grouped by situation.
// PH_CATS: [id, emoji, name]. PHRASES: [category, Dutch, English, optional word to hide in "fill the blank" (chosen automatically when left out)].
// PH_PATTERNS: a sentence frame with a {} gap, its English, and the words that fit: [Dutch, English].
const PH_CATS = [
  ['hello', '👋', 'Greetings & manners'], ['want', '🙋', 'Asking for things'], ['help', '🆘', 'Understanding & help'], ['eat', '🍽️', 'Café & restaurant'],
  ['shop', '🛍️', 'Shopping'], ['way', '🚆', 'Directions & transport'], ['talk', '💬', 'Small talk'], ['appt', '🩺', 'Appointments & services'],
  ['work', '📞', 'Phone & work'], ['home', '🏠', 'Around the house & time'], ['pat', '🧩', 'Sentence patterns'],
];
const PHRASES = [
  ['hello', 'Goedemorgen!', 'Good morning!'], ['hello', 'Goedemiddag!', 'Good afternoon!'], ['hello', 'Goedenavond!', 'Good evening!'], ['hello', 'Slaap lekker!', 'Sleep well!'],
  ['hello', 'Hoi! Hoe gaat het?', 'Hi! How are you?'], ['hello', 'Goed, dank je. En met jou?', 'Fine, thanks. And you?'], ['hello', 'Het gaat wel.', "It's okay. (so-so)"],
  ['hello', 'Hoe heet je?', 'What is your name? (informal)'], ['hello', 'Hoe heet u?', 'What is your name? (formal)'], ['hello', 'Ik heet Anna.', 'My name is Anna.', 'heet'],
  ['hello', 'Aangenaam kennis te maken.', 'Nice to meet you.'], ['hello', 'Tot ziens!', 'Goodbye!'], ['hello', 'Tot morgen!', 'See you tomorrow!'], ['hello', 'Tot straks!', 'See you later!'],
  ['hello', 'Fijn weekend!', 'Have a nice weekend!'], ['hello', 'Dank je wel!', 'Thank you! (informal)'], ['hello', 'Dank u wel!', 'Thank you! (formal)'], ['hello', 'Alsjeblieft.', 'Please. / Here you go.'],
  ['hello', 'Graag gedaan.', "You're welcome."], ['hello', 'Geen probleem.', 'No problem.'], ['hello', 'Sorry!', 'Sorry!'], ['hello', 'Pardon, mag ik er even langs?', 'Excuse me, may I get past?'],
  ['hello', 'Proost!', 'Cheers!'], ['hello', 'Gefeliciteerd!', 'Congratulations! / Happy birthday!'], ['hello', 'Veel succes!', 'Good luck!'], ['hello', 'Eet smakelijk!', 'Enjoy your meal!'], ['hello', 'Gezondheid!', 'Bless you!'],

  ['want', 'Kan ik u helpen?', 'Can I help you?'], ['want', 'Kunt u mij helpen?', 'Can you help me?'], ['want', 'Mag ik even iets vragen?', 'May I ask something quickly?'], ['want', 'Heeft u even tijd?', 'Do you have a moment?'],
  ['want', 'Kan ik hier zitten?', 'Can I sit here?'], ['want', 'Ik heb hulp nodig.', 'I need help.', 'hulp'], ['want', 'Ik heb een vraag.', 'I have a question.', 'vraag'], ['want', 'Ik weet het niet.', "I don't know."],
  ['want', 'Ik wil het graag proberen.', 'I would like to try it.'], ['want', 'Kunt u dat opschrijven?', 'Can you write that down?'], ['want', 'Mag ik uw telefoon even lenen?', 'May I borrow your phone for a moment?'],
  ['want', 'Heb je een oplader?', 'Do you have a charger?'], ['want', 'Mag het raam open?', 'Is it okay if the window is open?'], ['want', 'Wat is het wifi-wachtwoord?', "What's the wifi password?"],

  ['help', 'Ik begrijp het niet.', "I don't understand."], ['help', 'Kunt u dat herhalen, alstublieft?', 'Could you repeat that, please?'], ['help', 'Kunt u langzamer praten?', 'Could you speak more slowly?'],
  ['help', 'Spreekt u Engels?', 'Do you speak English?'], ['help', 'Ik spreek een beetje Nederlands.', 'I speak a little Dutch.', 'beetje'], ['help', 'Wat betekent dat?', 'What does that mean?'],
  ['help', 'Hoe zeg je dat in het Nederlands?', 'How do you say that in Dutch?'], ['help', 'Hoe spel je dat?', 'How do you spell that?'], ['help', 'Pardon, wat zegt u?', 'Pardon, what did you say?'],
  ['help', 'Het spijt me, ik heb het niet verstaan.', "I'm sorry, I didn't catch that."], ['help', 'Ik ben verdwaald.', "I'm lost."], ['help', 'Ik ben mijn portemonnee kwijt.', "I've lost my wallet."],
  ['help', 'Help!', 'Help!'], ['help', 'Bel de politie!', 'Call the police!'], ['help', 'Ik heb een ambulance nodig.', 'I need an ambulance.'],

  ['eat', 'Een tafel voor twee, alstublieft.', 'A table for two, please.'], ['eat', 'Ik heb een reservering op naam van Jansen.', 'I have a reservation under the name Jansen.'],
  ['eat', 'Mag ik de menukaart?', 'May I have the menu?'], ['eat', 'Wat raadt u aan?', 'What do you recommend?'], ['eat', 'Ik wil graag een kopje koffie.', 'I would like a cup of coffee.', 'koffie'],
  ['eat', 'Ik neem de soep.', "I'll have the soup.", 'soep'], ['eat', 'Ik ben vegetariër.', "I'm vegetarian."], ['eat', 'Ik ben allergisch voor noten.', "I'm allergic to nuts.", 'noten'],
  ['eat', 'Is dit gerecht pittig?', 'Is this dish spicy?'], ['eat', 'Mag ik nog een glas water?', 'May I have another glass of water?'], ['eat', 'Mag ik de rekening, alstublieft?', 'May I have the bill, please?', 'rekening'],
  ['eat', 'Kunnen we apart betalen?', 'Can we pay separately?', 'apart'], ['eat', 'Mag ik met pin betalen?', 'Can I pay by card?', 'pin'], ['eat', 'Het was heerlijk!', 'It was delicious!'],
  ['eat', 'Zonder suiker, alstublieft.', 'Without sugar, please.', 'suiker'], ['eat', 'Nog een biertje, alstublieft.', 'Another beer, please.', 'biertje'], ['eat', 'Ik heb honger.', "I'm hungry.", 'honger'], ['eat', 'Ik heb dorst.', "I'm thirsty.", 'dorst'],

  ['shop', 'Hoeveel kost dit?', 'How much is this?', 'kost'], ['shop', 'Dat is te duur.', "That's too expensive.", 'duur'], ['shop', 'Heeft u dit ook in een andere maat?', 'Do you have this in another size?', 'maat'],
  ['shop', 'Mag ik dit passen?', 'May I try this on?', 'passen'], ['shop', 'Ik kijk alleen even rond.', "I'm just looking around.", 'rond'], ['shop', 'Ik neem het.', "I'll take it."],
  ['shop', 'Heeft u een tasje?', 'Do you have a bag?', 'tasje'], ['shop', 'Mag ik een bonnetje?', 'May I have a receipt?', 'bonnetje'], ['shop', 'Waar is de kassa?', 'Where is the checkout?', 'kassa'],
  ['shop', 'Hoe laat gaat de winkel dicht?', 'What time does the shop close?', 'dicht'], ['shop', 'Hoe laat gaat de winkel open?', 'What time does the shop open?', 'open'],
  ['shop', 'Heeft u een bonuskaart?', 'Do you have a loyalty card?', 'bonuskaart'], ['shop', 'Ik wil dit graag ruilen.', 'I would like to exchange this.', 'ruilen'],
  ['shop', 'Ik zoek een cadeau voor mijn moeder.', "I'm looking for a present for my mother.", 'cadeau'],

  ['way', 'Waar is het toilet?', 'Where is the bathroom?', 'toilet'], ['way', 'Waar is het station?', 'Where is the station?', 'station'], ['way', 'Hoe kom ik bij het centrum?', 'How do I get to the centre?', 'centrum'],
  ['way', 'Is het ver van hier?', 'Is it far from here?', 'ver'], ['way', 'Ga rechtdoor.', 'Go straight ahead.'], ['way', 'Sla linksaf.', 'Turn left.'], ['way', 'Sla rechtsaf.', 'Turn right.'],
  ['way', 'Het is naast de bank.', "It's next to the bank.", 'naast'], ['way', 'Het is op de hoek.', "It's on the corner.", 'hoek'], ['way', 'Het is tegenover het station.', "It's opposite the station.", 'tegenover'],
  ['way', 'Kunt u me de weg wijzen?', 'Can you show me the way?', 'weg'], ['way', 'Welke bus gaat naar het centrum?', 'Which bus goes to the centre?', 'bus'], ['way', 'Stopt deze bus bij het station?', 'Does this bus stop at the station?', 'stopt'],
  ['way', 'Van welk perron vertrekt de trein?', 'Which platform does the train leave from?', 'perron'], ['way', 'Wanneer vertrekt de volgende trein?', 'When does the next train leave?', 'vertrekt'],
  ['way', 'Een kaartje naar Utrecht, alstublieft.', 'A ticket to Utrecht, please.', 'kaartje'], ['way', 'Een enkele reis of een retour?', 'A single or a return?', 'retour'],
  ['way', 'Is deze plek vrij?', 'Is this seat free?', 'plek'], ['way', 'Waar moet ik overstappen?', 'Where do I have to change?', 'overstappen'], ['way', 'De trein heeft vertraging.', 'The train is delayed.', 'vertraging'],

  ['talk', 'Waar kom je vandaan?', 'Where are you from?', 'vandaan'], ['talk', 'Waar woon je?', 'Where do you live?'], ['talk', 'Ik woon in Amsterdam.', 'I live in Amsterdam.', 'woon'],
  ['talk', 'Wat doe je voor werk?', 'What do you do for work?', 'werk'], ['talk', 'Ik werk als leraar.', 'I work as a teacher.', 'leraar'], ['talk', 'Hoe lang woon je hier al?', 'How long have you lived here?', 'lang'],
  ['talk', 'Ik leer Nederlands.', "I'm learning Dutch.", 'leer'], ['talk', 'Je spreekt goed Nederlands!', 'You speak Dutch well!', 'goed'], ['talk', 'Wat leuk!', 'How nice!'],
  ['talk', 'Wat een mooi weer!', 'What lovely weather!', 'weer'], ['talk', 'Het regent weer.', "It's raining again.", 'regent'], ['talk', 'Wat gezellig!', 'How cosy! (nice atmosphere)'],
  ['talk', 'Heb je kinderen?', 'Do you have children?', 'kinderen'], ['talk', 'Heb je zin om koffie te drinken?', 'Do you feel like having a coffee?', 'koffie'], ['talk', 'Zullen we iets afspreken?', 'Shall we arrange to meet?', 'afspreken'],
  ['talk', 'Dat lijkt me leuk!', 'That sounds fun!', 'lijkt'], ['talk', 'Natuurlijk!', 'Of course!'], ['talk', 'Misschien.', 'Maybe.'], ['talk', 'Ik ben het ermee eens.', 'I agree.', 'eens'],

  ['appt', 'Ik wil graag een afspraak maken.', 'I would like to make an appointment.', 'afspraak'], ['appt', 'Ik heb een afspraak om drie uur.', 'I have an appointment at three o’clock.', 'afspraak'],
  ['appt', 'Kan ik de afspraak verzetten?', 'Can I reschedule the appointment?', 'verzetten'], ['appt', 'Ik moet mijn afspraak annuleren.', 'I have to cancel my appointment.', 'annuleren'],
  ['appt', 'Ik voel me niet goed.', "I don't feel well.", 'voel'], ['appt', 'Ik heb hoofdpijn.', 'I have a headache.', 'hoofdpijn'], ['appt', 'Ik heb koorts.', 'I have a fever.', 'koorts'],
  ['appt', 'Het doet pijn.', 'It hurts.', 'pijn'], ['appt', 'Waar is de apotheek?', 'Where is the pharmacy?', 'apotheek'], ['appt', 'Ik heb een recept.', 'I have a prescription.', 'recept'],
  ['appt', 'Ik wil graag een pakket ophalen.', "I'd like to pick up a parcel.", 'pakket'], ['appt', 'Ik moet mijn adres wijzigen.', 'I need to change my address.', 'adres'],
  ['appt', 'Welk formulier moet ik invullen?', 'Which form do I need to fill in?', 'formulier'], ['appt', 'Hoe lang duurt het?', 'How long does it take?', 'duurt'],

  ['work', 'Met Anna.', 'This is Anna. (answering the phone)'], ['work', 'Met wie spreek ik?', 'Who am I speaking to?', 'spreek'], ['work', 'Kan ik meneer De Vries spreken?', 'Could I speak to Mr De Vries?', 'spreken'],
  ['work', 'Een ogenblik, alstublieft.', 'One moment, please.', 'ogenblik'], ['work', 'Ik bel u later terug.', "I'll call you back later.", 'terug'], ['work', 'Kunt u mij terugbellen?', 'Can you call me back?', 'terugbellen'],
  ['work', 'Ik stuur u een e-mail.', "I'll send you an email.", 'stuur'], ['work', 'De verbinding is slecht.', 'The connection is bad.', 'verbinding'], ['work', 'Ik werk vandaag thuis.', "I'm working from home today.", 'thuis'],
  ['work', 'Ik ben onderweg.', "I'm on my way."], ['work', 'Ik kom iets later.', "I'll be a little late.", 'later'], ['work', 'Past het morgen?', 'Does tomorrow suit you?', 'morgen'], ['work', 'Bedankt voor uw hulp.', 'Thank you for your help.', 'hulp'],

  ['home', 'Sorry dat ik te laat ben.', "Sorry I'm late.", 'laat'], ['home', 'Wat is er aan de hand?', "What's going on?", 'hand'], ['home', 'Het is kapot.', "It's broken.", 'kapot'],
  ['home', 'Er is geen warm water.', "There's no hot water.", 'warm'], ['home', 'De verwarming doet het niet.', "The heating isn't working.", 'verwarming'], ['home', 'Kunt u dat repareren?', 'Can you fix that?', 'repareren'],
  ['home', 'Hoe laat is het?', 'What time is it?', 'laat'], ['home', 'Het is half vier.', "It's half past three. (literally: half four)", 'half'], ['home', 'Het is kwart over negen.', "It's quarter past nine.", 'kwart'],
  ['home', 'Wat is de datum vandaag?', "What's the date today?", 'datum'], ['home', 'Ik ben jarig.', "It's my birthday.", 'jarig'],
];
const PH_PATTERNS = [
  { nl: 'Ik wil graag een {}.', en: 'I would like a {}.', swaps: [['koffie', 'coffee'], ['thee', 'tea'], ['biertje', 'beer'], ['glas water', 'glass of water'], ['broodje', 'sandwich'], ['tafel voor twee', 'table for two']] },
  { nl: 'Waar is het {}?', en: 'Where is the {}?', swaps: [['toilet', 'bathroom'], ['station', 'station'], ['ziekenhuis', 'hospital'], ['centrum', 'centre'], ['postkantoor', 'post office'], ['hotel', 'hotel'], ['museum', 'museum']] },
  { nl: 'Waar is de {}?', en: 'Where is the {}?', swaps: [['bushalte', 'bus stop'], ['supermarkt', 'supermarket'], ['apotheek', 'pharmacy'], ['uitgang', 'exit'], ['ingang', 'entrance'], ['bank', 'bank'], ['lift', 'lift']] },
  { nl: 'Heeft u een {}?', en: 'Do you have a {}?', swaps: [['kamer', 'room'], ['tafel', 'table'], ['menukaart', 'menu'], ['tas', 'bag'], ['pen', 'pen'], ['oplader', 'charger']] },
  { nl: 'Hoeveel kost een {}?', en: 'How much is a {}?', swaps: [['kaartje', 'ticket'], ['kopje koffie', 'cup of coffee'], ['broodje', 'sandwich'], ['kamer', 'room'], ['taxi', 'taxi']] },
  { nl: 'Mag ik een {}, alstublieft?', en: 'May I have a {}, please?', swaps: [['rekening', 'bill'], ['menukaart', 'menu'], ['glas water', 'glass of water'], ['zakje', 'bag'], ['kaartje', 'ticket'], ['bonnetje', 'receipt']] },
  { nl: 'Ik ben {}.', en: "I'm {}.", swaps: [['moe', 'tired'], ['ziek', 'sick'], ['verdwaald', 'lost'], ['blij', 'happy'], ['klaar', 'ready'], ['laat', 'late']] },
  { nl: 'Ik kom uit {}.', en: 'I come from {}.', swaps: [['Engeland', 'England'], ['Amerika', 'America'], ['Canada', 'Canada'], ['Australië', 'Australia'], ['Ierland', 'Ireland'], ['Duitsland', 'Germany']] },
  { nl: 'Ik spreek een beetje {}.', en: 'I speak a little {}.', swaps: [['Nederlands', 'Dutch'], ['Engels', 'English'], ['Frans', 'French'], ['Duits', 'German'], ['Spaans', 'Spanish']] },
  { nl: 'Ik ga {}.', en: 'I am going {}.', swaps: [['naar huis', 'home'], ['naar mijn werk', 'to work'], ['naar de winkel', 'to the shop'], ['naar het station', 'to the station'], ['naar de dokter', 'to the doctor'], ['boodschappen doen', 'shopping']] },
  { nl: 'Mag ik {} betalen?', en: 'Can I pay {}?', swaps: [['met pin', 'by card'], ['contant', 'in cash'], ['met creditcard', 'by credit card'], ['apart', 'separately']] },
  { nl: 'Ik heb een {}.', en: 'I have a {}.', swaps: [['afspraak', 'appointment'], ['vraag', 'question'], ['probleem', 'problem'], ['reservering', 'reservation'], ['kat', 'cat'], ['fiets', 'bike']] },
  { nl: 'Ik heb {} nodig.', en: 'I need {}.', swaps: [['hulp', 'help'], ['een dokter', 'a doctor'], ['een pen', 'a pen'], ['een kaartje', 'a ticket'], ['water', 'water'], ['tijd', 'time']] },
  { nl: 'Ik vind het {}.', en: 'I think it is {}.', swaps: [['leuk', 'nice'], ['lekker', 'tasty'], ['mooi', 'beautiful'], ['lastig', 'difficult'], ['gezellig', 'cosy'], ['duur', 'expensive']] },
];
