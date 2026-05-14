export type Work = {
  slug: string;
  title: string;
  year: number;
  medium: "video" | "photo" | "installation" | "mixed";
  category: string;
  cover: string;
  images: string[];
  description: string;
};

export const works: Work[] = [
  {
    slug: "ghostworld-zoe",
    title: "Ghostworld",
    year: 2024,
    medium: "photo",
    category: "Fotoserie · mit Zoe",
    cover: "/portfolio/ghostworld-zoe/cover.jpg",
    images: [
      "/portfolio/ghostworld-zoe/01.jpg",
      "/portfolio/ghostworld-zoe/02.jpg",
      "/portfolio/ghostworld-zoe/03.jpg",
      "/portfolio/ghostworld-zoe/04.jpg",
      "/portfolio/ghostworld-zoe/05.jpg",
    ],
    description:
      "Eine fotografische Studie über das Übersehen-Werden. Aufgenommen in einem leerstehenden Industriebau am Rand von Berlin, in einem Licht, das aussah, als hätte es sich verlaufen.",
  },
  {
    slug: "otherworldly",
    title: "Otherworldly",
    year: 2024,
    medium: "photo",
    category: "Fotoserie",
    cover: "/portfolio/otherworldly/cover.jpg",
    images: [
      "/portfolio/otherworldly/01.jpg",
      "/portfolio/otherworldly/02.jpg",
      "/portfolio/otherworldly/03.jpg",
      "/portfolio/otherworldly/04.jpg",
      "/portfolio/otherworldly/05.jpg",
    ],
    description:
      "Bilder von Orten, die fast hier sind. Eine Annäherung an das, was kurz vor der Auflösung steht — Räume, Körper, Stimmungen, die sich nicht ganz festlegen lassen.",
  },
  {
    slug: "vanna-analog",
    title: "Vanna · Analog",
    year: 2023,
    medium: "photo",
    category: "Fotoserie · analog",
    cover: "/portfolio/vanna-analog/cover.jpg",
    images: [
      "/portfolio/vanna-analog/01.jpg",
      "/portfolio/vanna-analog/02.jpg",
      "/portfolio/vanna-analog/03.jpg",
      "/portfolio/vanna-analog/04.jpg",
      "/portfolio/vanna-analog/05.jpg",
    ],
    description:
      "Portraitserie auf 35mm. Vanna an einem späten Nachmittag, das Korn als Mitautor. Aufgenommen ohne Plan, entwickelt mit Geduld.",
  },
  {
    slug: "lia-libre",
    title: "Lia Libre",
    year: 2024,
    medium: "video",
    category: "Musikvideo",
    cover: "/portfolio/lia-libre/cover.jpg",
    images: [
      "/portfolio/lia-libre/cover.jpg",
      "/portfolio/lia-libre/01.jpg",
      "/portfolio/lia-libre/02.jpg",
      "/portfolio/lia-libre/03.jpg",
      "/portfolio/lia-libre/04.jpg",
      "/portfolio/lia-libre/05.jpg",
      "/portfolio/lia-libre/06.jpg",
      "/portfolio/lia-libre/07.jpg",
      "/portfolio/lia-libre/08.jpg",
      "/portfolio/lia-libre/09.jpg",
      "/portfolio/lia-libre/10.jpg",
      "/portfolio/lia-libre/11.jpg",
      "/portfolio/lia-libre/12.jpg",
      "/portfolio/lia-libre/13.jpg",
      "/portfolio/lia-libre/14.jpg",
    ],
    description:
      "Musikvideo zu einem Track, der nicht stillhalten wollte. Plakat-Reihe und Stills aus der Produktion — eine Annäherung an Freiheit, die sich gerade selbst beobachtet.",
  },
  {
    slug: "escapism",
    title: "Escapism",
    year: 2024,
    medium: "video",
    category: "Musikvideo",
    cover: "/portfolio/escapism/cover.jpg",
    images: ["/portfolio/escapism/cover.jpg"],
    description:
      "Musikvideo. Eine Choreografie aus Bildern, die zu schnell verschwinden, um sie festzuhalten. Stills folgen, das Video ist auf Anfrage.",
  },
  {
    slug: "lichtuebung",
    title: "Lichtübung II",
    year: 2024,
    medium: "video",
    category: "Lichtkunst · mit Joana Jablanovszky",
    cover: "/portfolio/lichtuebung/cover.jpg",
    images: ["/portfolio/lichtuebung/cover.jpg"],
    description:
      "Eine Zusammenarbeit zur Architekturfassade Fischer. Licht als Material, Bewegung als Schrift. Stills folgen.",
  },
  {
    slug: "aufm-boxi",
    title: "Aufm Boxi",
    year: 2023,
    medium: "video",
    category: "Stadtporträt",
    cover: "/portfolio/aufm-boxi/cover.jpg",
    images: ["/portfolio/aufm-boxi/cover.jpg"],
    description:
      "Ein langes Wochenende am Boxhagener Platz, vier Kameras, ein lockerer Plan. Eine Beobachtung des Friedrichshainer Sommerabends.",
  },
];
