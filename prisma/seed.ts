import { PrismaClient, Role, ContentType, CertificateType, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // Nettoyer la base de données
  await cleanDatabase();

  // Créer les utilisateurs
  const users = await createUsers();
  console.log('👤 Utilisateurs créés:', users.length);

  // Créer les modules
  const modules = await createModules();
  console.log('📚 Modules créés:', modules.length);

  // Créer les chapitres pour chaque module
  const chapters = await createChapters(modules);
  console.log('📑 Chapitres créés:', chapters.length);

  // Créer les contenus pour chaque chapitre
  const contents = await createContents(chapters);
  console.log('🎬 Contenus créés:', contents.length);

  // Créer les quiz pour chaque chapitre
  const quizzes = await createQuizzes(chapters);
  console.log('❓ Quiz créés:', quizzes.length);

  // Créer des progressions pour les utilisateurs
  await createProgressData(users, modules, chapters, contents, quizzes);
  console.log('📊 Données de progression créées');

  // Créer des certificats
  await createCertificates(users, modules);
  console.log('🏆 Certificats créés');

  // Créer des notifications
  await createNotifications(users);
  console.log('🔔 Notifications créées');

  // Créer des versets quotidiens
  await createDailyVerses();
  console.log('📖 Versets quotidiens créés');

  // Créer la page d'accueil
  await createHomePage(modules);
  console.log('🏠 Page d\'accueil créée');

  console.log('✅ Seeding terminé avec succès!');
}

async function cleanDatabase() {
  // Supprimer les données existantes dans l'ordre inverse des dépendances
  await prisma.notification.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.quizResult.deleteMany();
  await prisma.contentProgress.deleteMany();
  await prisma.chapterProgress.deleteMany();
  await prisma.moduleProgress.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.content.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.module.deleteMany();
  await prisma.homePage.deleteMany();
  await prisma.dailyVerse.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsers() {
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const adminPassword = await bcrypt.hash('Admin123!', 10);

  const users = [
    // Admin
    {
      nom: 'Admin',
      prenom: 'Super',
      telephone: '+22990123456',
      email: 'admin@example.com',
      emailVerified: new Date(),
      password: adminPassword,
      pays: 'Bénin',
      ville: 'Cotonou',
      adresse: '123 Rue Principale',
      paroisse: 'Paroisse Centrale',
      role: Role.ADMIN,
      image: 'https://ui-avatars.com/api/?name=Super+Admin',
    },
    // Utilisateurs réguliers
    {
      nom: 'Dupont',
      prenom: 'Jean',
      telephone: '+22967123456',
      email: 'jean@example.com',
      emailVerified: new Date(),
      password: hashedPassword,
      pays: 'Bénin',
      ville: 'Cotonou',
      adresse: '45 Avenue des Cocotiers',
      paroisse: 'Paroisse Saint Michel',
      role: Role.USER,
      image: 'https://ui-avatars.com/api/?name=Jean+Dupont',
    },
    {
      nom: 'Kokou',
      prenom: 'Marie',
      telephone: '+22969876543',
      email: 'marie@example.com',
      emailVerified: new Date(),
      password: hashedPassword,
      pays: 'Togo',
      ville: 'Lomé',
      adresse: '78 Rue du Marché',
      paroisse: 'Paroisse Saint Jean',
      role: Role.USER,
      image: 'https://ui-avatars.com/api/?name=Marie+Kokou',
    },
    {
      nom: 'Adebayo',
      prenom: 'Paul',
      telephone: '+22965432198',
      email: 'paul@example.com',
      emailVerified: null, // Non vérifié
      password: hashedPassword,
      pays: 'Nigeria',
      ville: 'Lagos',
      adresse: '12 Church Street',
      paroisse: 'Celestial Parish',
      role: Role.USER,
      image: 'https://ui-avatars.com/api/?name=Paul+Adebayo',
    },
    {
      nom: 'Mensah',
      prenom: 'Sophie',
      telephone: '+22961234567',
      email: 'sophie@example.com',
      emailVerified: new Date(),
      password: hashedPassword,
      pays: 'Ghana',
      ville: 'Accra',
      adresse: '34 Main Road',
      paroisse: 'Holy Parish',
      role: Role.USER,
      image: 'https://ui-avatars.com/api/?name=Sophie+Mensah',
    },
  ];

  return await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  }).then(() => prisma.user.findMany());
}

async function createModules() {
  const modules = [
    {
      title: 'Introduction à la Foi Céleste',
      description: 'Ce module vous présente les fondements de la foi céleste et son histoire.',
      thumbnail: 'https://images.unsplash.com/photo-1519817914152-22d216bb9170?w=800&auto=format&fit=crop',
      order: 1,
      isActive: true,
    },
    {
      title: 'Les Principes Fondamentaux',
      description: 'Découvrez les principes fondamentaux qui guident notre pratique spirituelle.',
      thumbnail: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&auto=format&fit=crop',
      order: 2,
      isActive: true,
    },
    {
      title: 'Pratiques de Prière',
      description: 'Apprenez les différentes méthodes de prière et leur importance dans notre cheminement spirituel.',
      thumbnail: 'https://images.unsplash.com/photo-1517021897933-0e0319cfbc28?w=800&auto=format&fit=crop',
      order: 3,
      isActive: true,
    },
    {
      title: 'Étude des Écritures',
      description: 'Une exploration approfondie des textes sacrés et leur interprétation.',
      thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&auto=format&fit=crop',
      order: 4,
      isActive: false, // Module non actif
    },
  ];

  return await prisma.$transaction(
    modules.map(module => 
      prisma.module.create({
        data: module
      })
    )
  );
}

async function createChapters(modules: any[]) {
  const chaptersData = [];

  // Chapitres pour le module 1
  for (let i = 1; i <= 3; i++) {
    chaptersData.push({
      moduleId: modules[0].id,
      title: `Chapitre ${i} - ${['Histoire de l\'Église Céleste', 'Fondateurs et Vision', 'Structure Organisationnelle'][i-1]}`,
      description: `Description détaillée du chapitre ${i} du module Introduction à la Foi Céleste.`,
      order: i,
      isActive: true,
    });
  }

  // Chapitres pour le module 2
  for (let i = 1; i <= 4; i++) {
    chaptersData.push({
      moduleId: modules[1].id,
      title: `Chapitre ${i} - ${['Les Dix Commandements', 'La Trinité', 'La Foi et les Œuvres', 'La Vie Éternelle'][i-1]}`,
      description: `Description détaillée du chapitre ${i} du module Les Principes Fondamentaux.`,
      order: i,
      isActive: true,
    });
  }

  // Chapitres pour le module 3
  for (let i = 1; i <= 3; i++) {
    chaptersData.push({
      moduleId: modules[2].id,
      title: `Chapitre ${i} - ${['Prière Individuelle', 'Prière Collective', 'Méditation et Contemplation'][i-1]}`,
      description: `Description détaillée du chapitre ${i} du module Pratiques de Prière.`,
      order: i,
      isActive: true,
    });
  }

  // Chapitres pour le module 4 (inactif)
  for (let i = 1; i <= 2; i++) {
    chaptersData.push({
      moduleId: modules[3].id,
      title: `Chapitre ${i} - ${['Ancien Testament', 'Nouveau Testament'][i-1]}`,
      description: `Description détaillée du chapitre ${i} du module Étude des Écritures.`,
      order: i,
      isActive: i === 1, // Premier chapitre actif, deuxième inactif
    });
  }

  return await prisma.$transaction(
    chaptersData.map(chapter => 
      prisma.chapter.create({
        data: chapter
      })
    )
  );
}

async function createContents(chapters: any[]) {
  const contentsData = [];
  const videoUrls = [
    'https://eveil-chretien.com/video/Les_5_types_d_enseignement.mp4',
    'https://eveil-chretien.com/video/Les_5_types_d_enseignement.mp4',
    'https://eveil-chretien.com/update/video/Les_5_types_d_enseignement.mp4'
  ];
  
  const audioUrls = [
    'https://eveil-chretien.com/eglise/public/uploads/audio/Comment-transformer-un-souhait-une-envie-en-prophetie.mp3',
    'https://eveil-chretien.com/audio/Cet-arme-que-le-diable-contre-toi.mp3'
  ];

  // Créer un contenu pour chaque chapitre
  for (const chapter of chapters) {
    const isVideo = Math.random() > 0.3;
    
    contentsData.push({
      chapterId: chapter.id,
      title: `${isVideo ? 'Vidéo' : 'Audio'} - ${chapter.title}`,
      description: `Contenu ${isVideo ? 'vidéo' : 'audio'} pour ${chapter.title}`,
      type: isVideo ? ContentType.VIDEO : ContentType.AUDIO,
      url: isVideo 
        ? videoUrls[Math.floor(Math.random() * videoUrls.length)]
        : audioUrls[Math.floor(Math.random() * audioUrls.length)],
      duration: Math.floor(Math.random() * 300) + 120, // Entre 2 et 7 minutes
      order: 1,
      isActive: true,
    });
  }

  return await prisma.$transaction(
    contentsData.map(content => 
      prisma.content.create({
        data: content
      })
    )
  );
}

async function createQuizzes(chapters: any[]) {
  const quizzesData = [];

  for (const chapter of chapters) {
    // Créer un quiz pour chaque chapitre
    quizzesData.push({
      chapterId: chapter.id,
      title: `Quiz - ${chapter.title}`,
      passingScore: 70, // Score de passage par défaut
      questions: JSON.stringify([
        {
          id: '1',
          question: `Question 1 sur ${chapter.title}`,
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' }
          ],
          correctAnswer: 'a',
          explanation: 'Explication de la réponse correcte'
        },
        {
          id: '2',
          question: `Question 2 sur ${chapter.title}`,
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' }
          ],
          correctAnswer: 'b',
          explanation: 'Explication de la réponse correcte'
        },
        {
          id: '3',
          question: `Question 3 sur ${chapter.title}`,
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' }
          ],
          correctAnswer: 'c',
          explanation: 'Explication de la réponse correcte'
        },
        {
          id: '4',
          question: `Question 4 sur ${chapter.title}`,
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' }
          ],
          correctAnswer: 'd',
          explanation: 'Explication de la réponse correcte'
        },
        {
          id: '5',
          question: `Question 5 sur ${chapter.title}`,
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' }
          ],
          correctAnswer: 'a',
          explanation: 'Explication de la réponse correcte'
        }
      ])
    });
  }

  return await prisma.$transaction(
    quizzesData.map(quiz => 
      prisma.quiz.create({
        data: quiz
      })
    )
  );
}

async function createProgressData(users: any[], modules: any[], chapters: any[], contents: any[], quizzes: any[]) {
  // Créer des données de progression pour les 3 premiers utilisateurs (pas l'admin)
  const regularUsers = users.filter(user => user.role === Role.USER).slice(0, 3);
  
  for (const user of regularUsers) {
    // Progression pour le premier module (complété)
    await prisma.moduleProgress.create({
      data: {
        userId: user.id,
        moduleId: modules[0].id,
        isCompleted: true,
        completedAt: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000) // Dates aléatoires récentes
      }
    });
    
    // Progression pour le deuxième module (en cours)
    await prisma.moduleProgress.create({
      data: {
        userId: user.id,
        moduleId: modules[1].id,
        isCompleted: false
      }
    });
    
    // Progression des chapitres du premier module (tous complétés)
    const module1Chapters = chapters.filter(chapter => chapter.moduleId === modules[0].id);
    for (const chapter of module1Chapters) {
      await prisma.chapterProgress.create({
        data: {
          userId: user.id,
          chapterId: chapter.id,
          isCompleted: true,
          completedAt: new Date(Date.now() - Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000)
        }
      });
      
      // Progression des contenus de ce chapitre
      const chapterContents = contents.filter(content => content.chapterId === chapter.id);
      for (const content of chapterContents) {
        await prisma.contentProgress.create({
          data: {
            userId: user.id,
            contentId: content.id,
            watchTime: content.duration, // Complètement regardé
            isCompleted: true,
            completedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
          }
        });
      }
      
      // Résultats des quiz pour ce chapitre
      const chapterQuiz = quizzes.find(quiz => quiz.chapterId === chapter.id);
      if (chapterQuiz) {
        await prisma.quizResult.create({
          data: {
            userId: user.id,
            quizId: chapterQuiz.id,
            score: Math.floor(Math.random() * 30) + 70, // Score entre 70 et 100
            answers: JSON.stringify({
              '1': 'a',
              '2': 'b',
              '3': 'c',
              '4': 'd',
              '5': 'a'
            }),
            passed: true
          }
        });
      }
    }
    
    // Progression des chapitres du deuxième module (partiellement complétés)
    const module2Chapters = chapters.filter(chapter => chapter.moduleId === modules[1].id);
    for (let i = 0; i < module2Chapters.length; i++) {
      const chapter = module2Chapters[i];
      const isCompleted = i < 2; // Seuls les 2 premiers chapitres sont complétés
      
      await prisma.chapterProgress.create({
        data: {
          userId: user.id,
          chapterId: chapter.id,
          isCompleted,
          completedAt: isCompleted ? new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000) : null
        }
      });
      
      // Progression des contenus de ce chapitre
      const chapterContents = contents.filter(content => content.chapterId === chapter.id);
      for (const content of chapterContents) {
        const contentCompleted = isCompleted;
        const watchTime = contentCompleted ? content.duration : Math.floor(content.duration * (Math.random() * 0.7 + 0.2)); // Entre 20% et 90% si non complété
        
        await prisma.contentProgress.create({
          data: {
            userId: user.id,
            contentId: content.id,
            watchTime,
            isCompleted: contentCompleted,
            completedAt: contentCompleted ? new Date(Date.now() - Math.floor(Math.random() * 15) * 24 * 60 * 60 * 1000) : null
          }
        });
      }
      
      // Résultats des quiz pour ce chapitre (si complété)
      if (isCompleted) {
        const chapterQuiz = quizzes.find(quiz => quiz.chapterId === chapter.id);
        if (chapterQuiz) {
          await prisma.quizResult.create({
            data: {
              userId: user.id,
              quizId: chapterQuiz.id,
              score: Math.floor(Math.random() * 30) + 70, // Score entre 70 et 100
              answers: JSON.stringify({
                '1': 'a',
                '2': 'b',
                '3': 'c',
                '4': 'd',
                '5': 'a'
              }),
              passed: true
            }
          });
        }
      }
    }
    
    // Pour le troisième module, créer seulement quelques progressions de contenu
    if (modules.length > 2) {
      const module3Chapters = chapters.filter(chapter => chapter.moduleId === modules[2].id);
      if (module3Chapters.length > 0) {
        const firstChapter = module3Chapters[0];
        const chapterContents = contents.filter(content => content.chapterId === firstChapter.id);
        
        if (chapterContents.length > 0) {
          const content = chapterContents[0];
          await prisma.contentProgress.create({
            data: {
              userId: user.id,
              contentId: content.id,
              watchTime: Math.floor(content.duration * 0.3), // 30% regardé
              isCompleted: false,
              completedAt: null
            }
          });
        }
      }
    }
  }
}

async function createCertificates(users: any[], modules: any[]) {
  // Créer des certificats pour les utilisateurs qui ont terminé le premier module
  const regularUsers = users.filter(user => user.role === Role.USER).slice(0, 2);
  
  for (let i = 0; i < regularUsers.length; i++) {
    const user = regularUsers[i];
    const timestamp = Date.now() + i; // Ajouter un index pour garantir l'unicité
    
    await prisma.certificate.create({
      data: {
        userId: user.id,
        moduleId: modules[0].id,
        type: CertificateType.BRONZE,
        certificateNumber: `CERT-${user.id.substring(0, 6)}-${timestamp}-${modules[0].id.substring(0, 6)}`
      }
    });
  }
}

async function createNotifications(users: any[]) {
  // Notifications générales
  await prisma.notification.create({
    data: {
      title: 'Bienvenue sur la plateforme',
      content: 'Bienvenue sur notre plateforme de formation spirituelle. Commencez votre parcours dès maintenant!',
      type: NotificationType.INFO
    }
  });
  
  // Notifications pour chaque utilisateur
  for (const user of users) {
    if (user.role === Role.USER) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Nouveau module disponible',
          content: 'Un nouveau module de formation est maintenant disponible. Consultez-le dès maintenant!',
          type: NotificationType.SUCCESS,
          isRead: Math.random() > 0.5 // Certaines notifications sont lues, d'autres non
        }
      });
      
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Rappel de progression',
          content: 'N\'oubliez pas de continuer votre progression dans les modules en cours.',
          type: NotificationType.INFO,
          isRead: false
        }
      });
    }
  }
}

async function createDailyVerses() {
  const today = new Date();
  
  // Créer des versets pour les 7 derniers jours
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    await prisma.dailyVerse.create({
      data: {
        date,
        verse: `Verset biblique du jour ${i+1}. Que la paix et la grâce soient avec vous.`,
        reference: `Jean ${i+1}:${i+10}`
      }
    });
  }
}

async function createHomePage(modules: any[]) {
  await prisma.homePage.create({
    data: {
      heroTitle: 'Bienvenue sur la Plateforme de Formation Spirituelle',
      heroSubtitle: 'Développez votre foi et approfondissez vos connaissances spirituelles',
      heroImage: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&auto=format&fit=crop',
      featuredModules: JSON.stringify(modules.slice(0, 3).map(m => m.id)),
      testimonials: JSON.stringify([
        {
          id: '1',
          name: 'Jean Dupont',
          location: 'Cotonou, Bénin',
          content: 'Cette formation a transformé ma vie spirituelle. Je recommande vivement!',
          rating: 5,
          avatar: 'https://ui-avatars.com/api/?name=Jean+Dupont'
        },
        {
          id: '2',
          name: 'Marie Kokou',
          location: 'Lomé, Togo',
          content: 'Les enseignements sont clairs et profonds. Une excellente ressource pour grandir dans la foi.',
          rating: 4,
          avatar: 'https://ui-avatars.com/api/?name=Marie+Kokou'
        },
        {
          id: '3',
          name: 'Paul Adebayo',
          location: 'Lagos, Nigeria',
          content: 'Je suis reconnaissant pour cette plateforme qui m\'aide à approfondir ma compréhension des écritures.',
          rating: 5,
          avatar: 'https://ui-avatars.com/api/?name=Paul+Adebayo'
        }
      ]),
      announcements: JSON.stringify([
        {
          id: '1',
          title: 'Nouveau module disponible',
          content: 'Découvrez notre nouveau module sur les pratiques de prière!',
          type: 'success',
          date: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Maintenance prévue',
          content: 'Une maintenance est prévue le dimanche 20 septembre de 2h à 4h du matin.',
          type: 'warning',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          title: 'Bienvenue sur la plateforme',
          content: 'Bienvenue sur notre nouvelle plateforme de formation spirituelle!',
          type: 'info',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]),
      testimonialsTitle: 'Témoignages de nos Étudiants',
      testimonialsSubtitle: 'Découvrez comment notre formation spirituelle a impacté la vie de nos frères et sœurs',
      ctaTitle: 'Rejoignez notre Communauté',
      ctaSubtitle: 'Commencez votre parcours de formation spirituelle dès aujourd\'hui et grandissez avec nous dans la foi.'
    }
  });
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
