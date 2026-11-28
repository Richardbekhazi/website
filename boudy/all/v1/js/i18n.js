/*
  Translations.
  English is written in index.html and read from the page at start-up, so the page
  reads fully without JavaScript. Each other language is a dictionary below, keyed by
  the data-i18n / data-i18n-attr names used in the HTML.

  To add Arabic or Spanish later: add an entry to LANGS (Arabic uses dir: 'rtl';
  the CSS uses logical properties so the layout mirrors), add a dictionary with the
  same keys, and the toggle becomes a small menu (see setupToggle in main.js).
*/
window.I18N = {
  LANGS: {
    en: { label: 'English', dir: 'ltr', locale: 'en_CA' },
    fr: { label: 'Français', dir: 'ltr', locale: 'fr_CA' }
    // ar: { label: 'العربية', dir: 'rtl', locale: 'ar' },
    // es: { label: 'Español', dir: 'ltr', locale: 'es' }
  },
  META: {
    en: {
      title: 'Abdallah Najem | Physiotherapist in Ottawa & Vestibular Therapy',
      description: 'Abdallah Najem, Senior Registered Physiotherapist and Vestibular Therapist at Arro Wellness in Ottawa. Sports, orthopaedic and vestibular therapy for dizziness and vertigo, serving Westboro, Carlington, Nepean and the Queensway corridor. Book online.'
    },
    fr: {
      title: 'Abdallah Najem | Physiothérapeute à Ottawa et thérapie vestibulaire',
      description: 'Abdallah Najem, physiothérapeute agréé principal et thérapeute vestibulaire chez Arro Wellness à Ottawa. Physiothérapie sportive, orthopédique et vestibulaire pour les étourdissements et les vertiges, près de Westboro, Carlington, Nepean et du corridor de la Queensway. Réservez en ligne.'
    }
  },
  fr: {
    skip: 'Aller au contenu',
    homeLabel: 'Abdallah Najem, accueil',
    tagPortrait: '[PHOTO PORTRAIT]',
    tagTreatment: '[PHOTO DE TRAITEMENT]',
    tagPhoto: '[PHOTO]',
    tagClinic: '[PHOTO DE LA CLINIQUE]',
    navLabel: 'Navigation principale',
    navAbout: 'À propos',
    navServices: 'Services',
    navSession: 'Votre séance',
    navFaq: 'Questions',
    navClinic: 'Clinique',
    langToggle: 'EN',
    langToggleLabel: 'Switch to English',
    book: 'Réserver avec Abdallah',
    newTab: '(s’ouvre dans un nouvel onglet)',

    heroH1Hidden: 'Physiothérapeute à Ottawa :',
    heroRole: 'Physiothérapeute agréé principal et thérapeute vestibulaire',
    heroLead: 'J’aide les gens d’Ottawa à se remettre d’une blessure, à soulager leurs douleurs au cou et au dos, et à retrouver leur équilibre quand les étourdissements s’en mêlent.',
    callLabel: 'Appeler le',
    askFor: 'Demandez Abdallah lors de la réservation',
    askForShort: 'demandez Abdallah',
    portraitLabel: 'Portrait d’Abdallah',
    portraitAlt: 'Abdallah Najem, physiothérapeute agréé, en tenue médicale noire, les bras croisés',
    portraitCaption: 'Abdallah Najem, physiothérapeute agréé',
    handsAlt: 'Gros plan sur les bras croisés d’Abdallah, en tenue médicale noire',
    esNote: 'espagnol clinique de base',
    instaTitle: 'Conseils sur Instagram',
    instaText: 'Abdallah publie de courtes explications en langage simple sur les douleurs au cou, les étourdissements et la récupération.',
    ig1Alt: 'Publication Instagram : Abdallah Najem, services de physiothérapie à Ottawa, 12 ans d’expérience clinique au Canada et au Liban',
    ig2Alt: 'Publication Instagram : Étourdissements. La pièce tourne-t-elle quand vous bougez la tête ? Ce pourrait être un VPPB',
    ig3Alt: 'Publication Instagram : Vos soins dans votre langue, anglais, français, arabe et espagnol, avec les coordonnées pour réserver',

    trustTitle: 'En bref',
    trustYears: 'ans d’expérience clinique',
    trustCountries: 'pays de pratique : Canada et Liban',
    trustCreds: 'diplômes :',
    trustLangs: 'langues :',

    aboutTitle: 'L’évaluation d’abord, chaque fois',
    treatLabel: 'Abdallah au travail',
    treatAlt: 'Emplacement réservé à une photo d’Abdallah traitant un patient',
    about1: 'Je m’appelle Abdallah Najem, physiothérapeute agréé principal et thérapeute vestibulaire chez Arro Wellness, à Ottawa.',
    about2: 'En 12 ans, j’ai soigné des patients au Canada et au Liban : des athlètes qui reviennent d’une blessure, des travailleurs de bureau dont le cou se raidit un peu plus chaque jour, et des personnes pour qui la pièce tourne dès qu’elles bougent la tête.',
    about3: 'Ma formation comprend un BScPT, une maîtrise (MSc) en réadaptation sportive et un DPT.',
    about4: 'Chaque séance commence par une évaluation de votre façon de bouger. Ensuite, nous traitons ce qui vous limite avec des soins manuels, puis nous terminons par des exercices pour que les progrès durent.',
    about5: 'Je traite en français, en anglais, en arabe et en espagnol, pour que vous puissiez décrire ce que vous ressentez dans la langue dans laquelle vous pensez.',

    servicesTitle: 'Ce que je traite',
    servicesLead: 'Cinq domaines de soins, une même approche : comprendre la cause, puis travailler ensemble pour mieux bouger et vous sentir mieux.',
    kProblem: 'Le problème',
    kHelp: 'Comment je peux aider',
    s1Title: 'Physiothérapie et réadaptation sportives',
    s1Problem: 'Une blessure vous a éloigné de votre sport, de la course ou de l’entraînement, et vous ne savez pas quand ni comment reprendre.',
    s1Help: 'Nous regardons comment la blessure modifie vos mouvements, puis nous bâtissons un plan progressif de traitement et d’exercices pour vous aider à reprendre l’activité en confiance.',
    s1Alt: 'Supports à squat et disques de poids dans l’espace d’entraînement utilisé pour les exercices de réadaptation',
    s2Title: 'Physiothérapie orthopédique',
    s2Problem: 'Douleurs au cou, au dos ou à l’épaule, tensions musculaires et raideurs qui compliquent le travail, le sommeil ou les tâches quotidiennes.',
    s2Help: 'Pour les travailleurs de bureau qui ont mal au cou, ce n’est pas qu’une question de posture. Un manque de mobilité, un haut du dos raide et des fléchisseurs profonds du cou moins forts peuvent tous jouer un rôle ; le traitement tient donc compte des trois.',
    s2Alt: 'Gravure anatomique de la colonne vertébrale et du bassin, teintée en bleu',
    s3Title: 'Thérapie vestibulaire',
    s3Problem: 'Étourdissements, vertiges ou VPPB : l’impression que la pièce tourne quand vous vous retournez dans le lit ou tournez la tête.',
    s3Help: 'Une évaluation vestibulaire cherche ce qui cause les symptômes. Selon la cause, des mouvements de tête précis et des exercices d’équilibre peuvent vous aider à retrouver votre stabilité.',
    s3Alt: 'Gravure de 1806 de l’oreille interne, montrant les canaux semi-circulaires qui perçoivent les mouvements de la tête',
    s4Title: 'Thérapie par ondes de choc',
    s4Problem: 'Une douleur qui persiste depuis un moment peut demander un autre outil, en plus des soins manuels et des exercices.',
    s4Help: 'La thérapie par ondes de choc fait partie des traitements que j’offre. Après votre évaluation, je vous dirai si elle convient à votre situation et comment elle s’intègre à votre plan.',
    s4Alt: 'Appareil de thérapie par ondes de choc avec ses deux pièces à main, teinté en bleu',
    s5Title: 'Mobilisation des tissus mous et thérapie manuelle',
    s5Problem: 'Des muscles et des fascias tendus qui limitent vos mouvements.',
    s5Help: 'Ce n’est pas un massage. Le massage vise surtout la détente ; la mobilisation des tissus mous fait partie d’un traitement de physiothérapie. J’évalue d’abord votre façon de bouger, puis j’utilise des techniques manuelles ciblées sur les tissus qui vous limitent, et j’ajoute des exercices pour que les résultats durent.',
    s5Alt: 'Table de traitement avec un oreiller dans une salle de traitement chez Arro Wellness',

    spinTitle: 'Quand la pièce tourne',
    spinText: 'Avec le VPPB, de minuscules cristaux de l’oreille interne peuvent se déplacer. Un simple mouvement de tête envoie alors un faux signal, et la pièce semble tourner.',
    spinBtn: 'Tournez la tête',
    spinAlt: 'Dessin d’une pièce avec une fenêtre et une porte, qui tourne puis se stabilise',
    spinCaption: 'La thérapie vestibulaire vise une pièce qui reste immobile.',
    spinSpinning: 'La pièce tourne…',
    spinSettled: 'Et elle se stabilise.',

    stepsTitle: 'À quoi vous attendre en séance',
    stepImg1: 'Équipement de réadaptation et modèle de genou au mur de la salle de traitement',
    stepImg2: 'Table de traitement dans une salle de traitement chez Arro Wellness',
    stepImg3: 'Espace d’entraînement avec supports à squat pour les exercices',
    stepsLead: 'Chaque visite suit le même ordre : vous savez toujours où vous en êtes, et pourquoi.',
    step1Title: 'Évaluer',
    step1Text: 'Nous parlons de ce que vous ressentez et de ce que vous voulez retrouver. Ensuite, j’observe comment vous bougez pour trouver ce qui cause le problème, pas seulement l’endroit où ça fait mal.',
    step2Title: 'Traiter',
    step2Text: 'Le traitement manuel cible ce que l’évaluation a révélé : mobilisation des tissus mous, thérapie manuelle et, au besoin, ondes de choc ou techniques vestibulaires.',
    step3Title: 'S’exercer',
    step3Text: 'Vous repartez avec quelques exercices choisis pour vous, pour que les progrès faits en clinique se poursuivent à la maison.',

    faqTitle: 'Questions fréquentes',
    q1: 'La mobilisation des tissus mous, est-ce la même chose qu’un massage ?',
    a1: 'Non. Le massage vise surtout la détente. La mobilisation des tissus mous fait partie d’un traitement de physiothérapie : j’évalue d’abord votre façon de bouger, puis j’utilise des techniques manuelles ciblées sur les muscles et les fascias qui vous limitent, et j’ajoute des exercices pour que les résultats durent.',
    q2: 'Pourquoi ai-je mal au cou après une journée au bureau ?',
    a2: 'Rester assis toute la journée y contribue, mais ce n’est pas qu’une question de posture. Un manque de mobilité, une raideur du haut du dos et une force réduite des fléchisseurs profonds du cou peuvent tous jouer un rôle. L’évaluation montre lesquels vous concernent, et le traitement et les exercices peuvent vous aider à retrouver un cou plus confortable.',
    q3: 'Que faire si la pièce tourne quand je bouge la tête ?',
    a3: 'Cette sensation est souvent liée au VPPB, un problème de l’oreille interne pour lequel la thérapie vestibulaire peut aider. Prenez rendez-vous pour une évaluation vestibulaire afin d’en vérifier la cause et de la traiter. Si l’étourdissement apparaît soudainement avec de nouveaux symptômes comme une difficulté à parler, une faiblesse, un engourdissement ou un mal de tête intense, composez le 911 immédiatement.',
    q4: 'Offrez-vous la facturation directe ?',
    a4ph: '[DÉTAILS DE FACTURATION DIRECTE : assureurs acceptés et fonctionnement chez Arro Wellness]',
    a4: 'Appelez la clinique au 613-627-8808 pour confirmer selon votre régime.',
    q5: 'Quels sont vos tarifs ?',
    a5ph: '[TARIFS : évaluation initiale et séances de suivi]',
    a5: 'Appelez la clinique pour connaître les tarifs en vigueur.',
    factsLabel: 'Coordonnées de la clinique',
    roomLabel: 'Salle de traitement',
    roomAlt: 'Une salle de traitement chez Arro Wellness, avec une table de traitement, une fenêtre et de l’équipement de réadaptation au mur',
    factWhere: 'Où',
    factPhone: 'Téléphone',
    factHours: 'Heures',
    hoursPh: '[HEURES D’OUVERTURE]',

    langsTitle: 'Vos soins dans votre langue',
    langsText: 'La douleur et les étourdissements sont déjà difficiles à décrire. Vous pouvez le faire dans la langue où vous êtes le plus à l’aise.',

    reviewsTitle: 'Ce qu’en disent les patients',
    reviewsText: 'Les avis des patients seront publiés ici, mot pour mot, dès qu’ils auront été recueillis.',
    review1: '[AVIS 1 : les mots du patient, son prénom ou ses initiales, et où l’avis a été publié]',
    review2: '[AVIS 2 : les mots du patient, son prénom ou ses initiales, et où l’avis a été publié]',
    review3: '[AVIS 3 : les mots du patient, son prénom ou ses initiales, et où l’avis a été publié]',

    clinicTitle: 'Trouver la clinique',
    postalPh: '[CODE POSTAL]',
    clinicAreas: 'À proximité de Westboro, Carlington, Nepean et du corridor de la Queensway.',
    directions: 'Itinéraire',
    mapTitle: 'Carte du 1600, avenue Laperriere, Ottawa',
    tourTitle: 'Visite de la clinique',
    tour1: 'Salle de traitement',
    tour2: 'Équipement de réadaptation',
    tour3: 'Table de traitement',
    tour4: 'Espace d’entraînement',
    tour1Alt: 'Vue d’ensemble d’une salle de traitement chez Arro Wellness',
    tour2Alt: 'Rouleaux de mousse, ballons d’exercice, haltères et modèle de genou au mur de la salle de traitement',
    tour3Alt: 'Gros plan sur une table de traitement réglable',
    tour4Alt: 'Espace d’entraînement avec supports à squat et disques de poids',

    ctaTitle: 'Réservez votre visite',
    ctaText: 'Réservez en ligne, ou appelez la clinique et demandez Abdallah.',
    ctaEmail: 'Courriel',
    ctaFollow: 'Suivre',
    callAria: 'Appeler la clinique, 613-627-8808',
    creditsLabel: 'Crédits des images (teintées en bleu) :',
    disclaimer:'Les renseignements sur ce site sont généraux et ne remplacent pas une évaluation.'
  },
  // Strings used only by scripts (English versions here, since they are not in the HTML)
  en: {
    spinSpinning: 'The room is spinning…',
    spinSettled: 'And it settles.'
  }
};
