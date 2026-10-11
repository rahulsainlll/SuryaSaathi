/** Links and sources shared by the site and the blog. */

export const REPO = "https://github.com/rahulsainlll/SuryaSaathi";
export const YOUTUBE_ID = "m6HiN65kmdo";
export const YOUTUBE_URL = `https://www.youtube.com/watch?v=${YOUTUBE_ID}`;

export const SOURCES = {
  pmSuryaGhar: { name: "pv magazine India", href: "https://www.pv-magazine-india.com/?p=16188" },
  monitoring: {
    name: "ETV Bharat",
    href: "https://etvbharat.com/en/bharat/rooftop-solar-push-under-pm-surya-ghar-yojana-crossed-37-lakh-but-maintenance-a-challenge-enn26070705272",
  },
  dust: { name: "Renewable Watch", href: "https://renewablewatch.in/2018/12/22/soiling-analysis/" },
  maintenance: {
    name: "Delhi Solar Portal",
    href: "https://solar.delhi.gov.in/page/operation-and-maintenance-procedure",
  },
  recFramework: {
    name: "REC framework",
    href: "https://renewablewatch.in/2024/11/28/rec-releases-guidelines-for-vendor-operations-under-pm-surya-ghar/",
  },
  delhiPolicy: {
    name: "Delhi Solar Energy Policy, Second Amendment (summary)",
    href: "https://advocategandhi.com/delhi-solar-energy-policy-2023-gets-major-second-amendment-new-rooftop-solar-subsidies-free-solar-for-eligible-households-and-discom-trusteeship-model-introduced/",
  },
  delhiTarget: {
    name: "ANI",
    href: "https://aninews.in/news/national/general-news/delhi-solar-policy-gets-major-push-230-lakh-rooftops-targeted-by-march-202720260901221119/",
  },
} as const;

export const TEAM = [
  { name: "Rahul Sain", github: "rahulsainlll" },
  { name: "Yukti", github: "Kiarstein" },
  { name: "Mayank Dhokal", github: "mayankdhokal" },
] as const;
