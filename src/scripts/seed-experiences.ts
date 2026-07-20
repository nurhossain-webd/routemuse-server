import "dotenv/config";

import mongoose from "mongoose";
import { z } from "zod";

import { connectDatabase } from "../config/database.js";
import { ExperienceModel } from "../models/experience.model.js";
import { UserModel } from "../models/user.model.js";
import { createSlug } from "../utils/sanitize.js";

const seedEnvironmentSchema = z.object({
  DEMO_USER_EMAIL: z.string().trim().toLowerCase().email(),
});

const availability = {
  availableFrom: new Date("2026-08-01T00:00:00.000Z"),
  availableTo: new Date("2028-12-31T23:59:59.000Z"),
  status: "published" as const,
};

const experiences = [
  {
    title: "Old Dhaka Heritage and Food Walk",
    shortDescription: "Walk through centuries-old lanes while tasting the dishes that define historic Dhaka.",
    fullDescription: "A local guide leads a small group through Shankhari Bazaar, Armenian Church surroundings, and the Buriganga riverfront, connecting Mughal-era history with carefully selected traditional snacks and a full local meal.",
    category: "Culture & Food", location: "Old Dhaka", country: "Bangladesh", price: 42, durationHours: 5,
    imageUrls: ["https://images.unsplash.com/photo-1609947017136-9daf32a5eb16?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Shankhari Bazaar lanes", "Buriganga riverfront", "Guided traditional tastings"],
    included: ["Local guide", "Five tastings", "Bottled water"], excluded: ["Hotel transport", "Personal purchases"], ...availability,
  },
  {
    title: "Sundarbans Mangrove Wildlife Expedition",
    shortDescription: "Navigate quiet mangrove channels and watch for dolphins, deer, crocodiles, and rare birds.",
    fullDescription: "This conservation-minded boat journey explores the waterways and watchtowers of the Sundarbans with trained naturalists. The itinerary balances wildlife observation, village context, and low-impact travel practices.",
    category: "Wildlife", location: "Sundarbans", country: "Bangladesh", price: 285, durationHours: 48,
    imageUrls: ["https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Mangrove creek safari", "Naturalist-led wildlife tracking", "Sunrise from the river"],
    included: ["Cabin accommodation", "Meals", "Permits", "Naturalist guide"], excluded: ["Travel insurance", "Dhaka transfers"], ...availability,
  },
  {
    title: "Cox's Bazar Sunrise Surf Session",
    shortDescription: "Learn to surf on a broad sandy beach during the calm light of an early coastal morning.",
    fullDescription: "Certified instructors introduce ocean safety, board control, paddling, and standing technique before a coached water session. Groups remain small so first-time and improving surfers receive close guidance.",
    category: "Adventure", location: "Cox's Bazar", country: "Bangladesh", price: 38, durationHours: 3,
    imageUrls: ["https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Sunrise beach session", "Small-group coaching", "Beginner-friendly waves"],
    included: ["Surfboard", "Rash guard", "Certified instructor"], excluded: ["Breakfast", "Hotel pickup"], ...availability,
  },
  {
    title: "Srimangal Tea Gardens Cycling Day",
    shortDescription: "Cycle between tea estates, forest roads, and village markets in Bangladesh's green northeast.",
    fullDescription: "A supported ride follows quiet roads through working tea gardens and shaded forest edges. Stops introduce tea production, seasonal agriculture, and Manipuri community crafts without intruding on private life.",
    category: "Cycling", location: "Srimangal", country: "Bangladesh", price: 55, durationHours: 7,
    imageUrls: ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Tea estate roads", "Forest-edge riding", "Tea tasting with growers"],
    included: ["Bicycle and helmet", "Guide", "Lunch", "Support vehicle"], excluded: ["Intercity transport", "Cycling clothing"], ...availability,
  },
  {
    title: "Kyoto Dawn Temples and Tea Ceremony",
    shortDescription: "Visit tranquil temple grounds before the crowds and join a respectful private tea ceremony.",
    fullDescription: "Begin at dawn with a cultural guide in eastern Kyoto, learning how garden design, seasonal ritual, and neighborhood history connect. A tea practitioner then introduces the gestures and meaning of chanoyu.",
    category: "Culture", location: "Kyoto", country: "Japan", price: 145, durationHours: 5,
    imageUrls: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Quiet dawn temple visit", "Private tea ceremony", "Gion neighborhood walk"],
    included: ["Cultural guide", "Temple entry", "Tea and seasonal sweet"], excluded: ["Kimono rental", "Hotel transfer"], ...availability,
  },
  {
    title: "Atlas Mountains Berber Village Trek",
    shortDescription: "Hike highland trails to Amazigh villages with mountain guides and a home-cooked lunch.",
    fullDescription: "Depart Marrakech for a guided day in the High Atlas, following mule paths through walnut groves and terraced valleys. Hosts share a traditional lunch while guides explain local ecology and village life.",
    category: "Hiking", location: "Imlil", country: "Morocco", price: 92, durationHours: 9,
    imageUrls: ["https://images.unsplash.com/photo-1489493585363-d69421e0edd3?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["High Atlas panoramas", "Amazigh village visit", "Terrace-side lunch"],
    included: ["Mountain guide", "Marrakech transfer", "Lunch", "Tea"], excluded: ["Trekking poles", "Guide gratuity"], ...availability,
  },
  {
    title: "Reykjanes Geothermal Landscape Journey",
    shortDescription: "Explore steaming fields, volcanic coastlines, and young lava landscapes with a geologist guide.",
    fullDescription: "Travel across Iceland's Reykjanes Peninsula with a guide trained in earth science. Safe viewpoints reveal geothermal systems, recent lava flows, sea cliffs, and the relationship between local communities and volcanic risk.",
    category: "Nature", location: "Reykjanes Peninsula", country: "Iceland", price: 180, durationHours: 8,
    imageUrls: ["https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Geothermal fields", "Atlantic sea cliffs", "Geologist interpretation"],
    included: ["Reykjavik transfer", "Geologist guide", "Hot drink"], excluded: ["Lunch", "Geothermal spa admission"], ...availability,
  },
  {
    title: "Mekong Delta Farm and Canal Day",
    shortDescription: "Travel by small boat and bicycle through orchard communities away from the busiest delta routes.",
    fullDescription: "A locally operated journey combines narrow canal travel, an easy village bicycle ride, and seasonal fruit tasting. Hosts explain water management, orchard farming, and changing livelihoods in the Mekong Delta.",
    category: "Local Life", location: "Ben Tre", country: "Vietnam", price: 76, durationHours: 9,
    imageUrls: ["https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Small canal boat", "Village cycling", "Family orchard lunch"],
    included: ["Transport from Ho Chi Minh City", "Boat", "Bicycle", "Lunch"], excluded: ["Alcoholic drinks", "Personal purchases"], ...availability,
  },
  {
    title: "Patagonia Glacier Viewpoint Hike",
    shortDescription: "Follow a dramatic Andean trail to panoramic views of ice fields, peaks, and turquoise lakes.",
    fullDescription: "Experienced mountain guides lead a full-day hike from El Chaltén, selecting the safest route for current conditions. The day includes geology, native flora, Leave No Trace practice, and ample time at scenic viewpoints.",
    category: "Hiking", location: "El Chaltén", country: "Argentina", price: 165, durationHours: 10,
    imageUrls: ["https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Andean glacier views", "Certified mountain guide", "Small hiking group"],
    included: ["Guide", "Trail lunch", "Trekking poles"], excluded: ["Hiking boots", "Travel insurance"], ...availability,
  },
  {
    title: "Lisbon Tiles, Workshops, and Tramways",
    shortDescription: "Trace Lisbon's visual history through tiled facades, artisan workshops, and hillside streets.",
    fullDescription: "An art historian guides this walking route through Alfama and Mouraria, decoding azulejo patterns and urban history. A hands-on workshop lets guests paint a tile using traditional design principles.",
    category: "Art & Design", location: "Lisbon", country: "Portugal", price: 68, durationHours: 4,
    imageUrls: ["https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Azulejo history walk", "Tile-painting workshop", "Historic tram ride"],
    included: ["Art historian guide", "Workshop materials", "Tram ticket"], excluded: ["Shipping finished tile", "Meals"], ...availability,
  },
  {
    title: "Maasai Mara Conservation Safari",
    shortDescription: "Observe savanna wildlife with guides who connect each sighting to active conservation work.",
    fullDescription: "A three-day small-group safari uses community-linked camps and experienced naturalist guides. Game drives focus on patient observation, ecosystem relationships, and the realities of protecting migration corridors.",
    category: "Wildlife", location: "Maasai Mara", country: "Kenya", price: 890, durationHours: 72,
    imageUrls: ["https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Dawn and dusk game drives", "Community conservancy", "Naturalist-led interpretation"],
    included: ["Two nights accommodation", "Meals", "Park fees", "Game drives"], excluded: ["International flights", "Visa", "Travel insurance"], ...availability,
  },
  {
    title: "Cappadocia Valleys Sunrise Hike",
    shortDescription: "Walk among sculpted valleys and rock-cut churches as morning light reaches Cappadocia.",
    fullDescription: "A local hiking guide leads a sunrise route through lesser-used valley paths, explaining volcanic geology, cave architecture, and regional history. The walk finishes with a generous village breakfast.",
    category: "Hiking", location: "Cappadocia", country: "Türkiye", price: 74, durationHours: 5,
    imageUrls: ["https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1600&q=80"],
    highlights: ["Sunrise valley trail", "Rock-cut heritage", "Village breakfast"],
    included: ["Local guide", "Breakfast", "Hotel pickup in Göreme"], excluded: ["Balloon flight", "Museum entry"], ...availability,
  },
];

const seed = async (): Promise<void> => {
  const { DEMO_USER_EMAIL } = seedEnvironmentSchema.parse(process.env);
  await connectDatabase();
  const creator = await UserModel.findOne({ email: DEMO_USER_EMAIL });
  if (!creator) throw new Error("Demo user not found. Run npm run seed:demo first.");

  for (const experience of experiences) {
    const slug = createSlug(experience.title);
    await ExperienceModel.findOneAndUpdate(
      { slug },
      { $set: { ...experience, slug, creator: creator._id } },
      { upsert: true, runValidators: true },
    );
  }
  console.log(`Seeded ${experiences.length} travel experiences`);
};

seed()
  .catch((error: unknown) => {
    console.error("Unable to seed experiences:", error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
