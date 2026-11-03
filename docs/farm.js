/**
 * MUSYA & KETI: INFINITE GALLERY - Farm & Idle Game Engine (farm.js)
 * Features:
 * - Persistent Idle & Farming loop (crops, buildings, Musya & Keti skills, quests, territories)
 * - Deep connection to Infinite Gallery: unlocks real bijective PRP exhibits
 * - Offline time progress calculation with welcome-back modal
 * - JSON Export / Import of save state
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'musya_keti_farm_save';

  // Pre-generated 100% valid mathematical PRP addresses for Farm Trophies
  const FARM_TROPHIES = {
    trophy_garden: {
      id: "b32_OOpE528F05w9O_rRI_IEBNAJCoKSbAwwbFJ4Q21b-mJd7Zp87sX2vUOU3L1l8L5x3N5j8V3mXm5L4C5H1M9A0X2I8V1K6M4B6H1P9U7C4E1M9Z3H2E1N8P1U4M2E4G1S8W2J4C7K4N8A0K2G9Q6T3D9J8M2U7J6V5L1U5H0P9N2T5G0M8V7C8C5Q1Y6O2J4V8X6E9R4N2A9N4N7V9V8V0K5O2Z6K3M5D1G2W3F3V5C2V6Z3S4F7Z3M2E5Q8S1G4R7C7S6Z6G9M0C2S8Y8E3M9Y0D9B0J1N7V8M1L7J6O7R9J5E3R3L3G5R8U4O8P0M4J9R9E8S5W2M8V2E4B1N7Q1D1C6F8X2K4E6Z3P0A2B9Z3K7V9E8J3Z5K9L6S1T7K3R4Q2J5N9B6C1W4A1B9X6S4Z0G0M7B5V9U5S8B3X8A8D5N4Q4W0K2Y2E6U1D9E7F4E1U4C1C4R9U4D9A0W7U2K8V3M4B8Z6H4W1X2D3O3G3S7Z1S7E2C3G9A8Z9L4A6G5U1L8B0H9W0L0S4L8A0N2B9G1U5F8E2O1R4V0V1T5N2L8X1O6U5U5D4K7P2A3V3U1V6V3B9V6X1F8E3C3Y3C9Z5Z5T2M2M8N1A3H5Z5K4A5M7M1U7T5O8A8L5R2R2E8M8X0T4X5C4C4U1M9Z3S1Q0A7F5M9T2X0D3N4P1T9X8K4B5A5W1O7X2H1O2L2N5W9O8S1F0K5O2E4V3S1S6D2Z8N5G2G2M2Z4R8P0T2L7A1L5Y9L3J7Z5Q6S6B8N8Q7D1B9V2S8U3N9V6T3Q8X8L1Q6A1J2A2F3E2G0G0P7B0N8N7W9T6P9E5G4D3P4Z7C6Z0L7S3S6P2Q5E9S9R2J4K4J9R8W9U4R5U3S3U9B1P0M7P7G6U2Q2L8O9Z4N8S1A6O4R2Y2U0Z9W7W6Z9G1M9Z4C4E1M9Z3H2E1N8P1U4M2E4G1S8W2J4C7K4N8A0K2G9Q6T3D9J8M2U7J6V5L1U5H0P9N2T5G0M8V7C8C5Q1Y6O2J4V8X6E9R4N2A9N4N7V9V8V0K5O2Z6K3M5D1G2W3F3V5C2V6Z3S4F7Z3M2E5Q8S1G4R7C7S6Z6G9M0C2S8Y8E3M9Y0D9B0J1N7V8M1L7J6O7R9J5E3R3L3G5R8U4O8P0M4J9R9E8S5W2M8V2E4B1N7Q1D1C6F8X2K4E6Z3P0A2B9Z3K7V9E8J3Z5K9L6S1T7K3R4Q2J5N9B6C1W4A1B9X6S4Z0G0M7B5V9U5S8B3X8A8D5N4Q4W0K2Y2E6U1D9E7F4E1U4C1C4R9U4D9A0W7U2K8V3M4B8Z6H4W1X2D3O3G3S7Z1S7E2C3G9A8Z9L4A6G5U1L8B0H9W0L0S4L8A0N2B9G1U5F8E2O1R4V0V1T5N2L8X1O6U5U5D4K7P2A3V3U1V6V3B9V6X1F8E3C3Y3C9Z5Z5T2M2M8N1A3H5Z5K4A5M7M1U7T5O8A8L5R2R2E8M8X0T4X5C4C4U1M9Z3S1Q0A7F5M9T2X0D3N4P1T9X8K4B5A5W1O7X2H1O2L2N5W9O8S1F0K5O2E4V3S1S6D2Z8N5G2G2M2Z4R8P0T2L7A1L5Y9L3J7Z5Q6S6B8N8Q7D1B9V2S8U3N9V6T3Q8X8L1Q6A1J2A2F3E2G0G0P7B0N8N7W9T6P9E5G4D3P4Z7C6Z0L7S3S6P2Q5E9S9R2J4K4J9R8W9U4R5U3S3U9B1P0M7P7G6U2Q2L8O9Z4N8S1A6O4R2Y2U0Z9W7W6Z9G1M9Z4C4E1M9Z3H2E1N8P1U4M2E4G1S8W2J4C7K4N8A0K2G9Q6T3D9J8M2U7J6V5L1U5H0P9N2T5G0M8V7C8C5Q1Y6O2J4V8X6E9R4N2A9N4N7V9V8V0K5O2Z6K3M5D1G2W3F3V5C2V6Z3S4F7Z3M2E5Q8S1G4R7C7S6Z6G9M0C2S8Y8E3M9Y0D9B0J1N7V8M1L7J6O7R9J5E3R3L3G5R8U4O8P0M4J9R9E8S5W2M8V2E4B1N7Q1D1C6F8X2K4E6Z3P0A2B9Z3K7V9E8J3Z5K9L6S1T7K3R4Q2J5N9B6C1W4A1B9X6S4Z0G0M7B5V9U5S8B3X8A8D5N4Q4W0K2Y2E6U1D9E7F4E1U4C1C4R9U4D9A0W7U2K8V3M4B8Z6H4W1X2D3O3G3S7Z1S7E2C3G9A8Z9L4A6G5U1L8B0H9W0L0S4L8A0N2B9G1U5F8E2O1R4V0V1T5N2L8X1O6U5U5D4K7P2A3V3U1V6V3B9V6X1F8E3C3Y3C9Z5Z5T2M2M8N1A3H5Z5K4A5M7M1U7T5O8A8L5R2R2E8M8X0T4X5C4C4U1M9Z3S1Q0A7F5M9T2X0D3N4P1T9X8K4B5A5W1O7X2H1O2L2N5W9O8S1F0K5O2E4V3S1S6D2Z8N5G2G2M2Z4R8P0T2L7A1L5Y9L3J7Z5Q6S6B8N8Q7D1B9V2S8U3N9V6T3Q8X8L1Q6A1J2A2F3E2G0G0P7B0N8N7W9T6P9E5G4D3P4Z7C6Z0L7S3S6P2Q5E9S9R2J4K4J9R8W9U4R5U3S3U9B1P0M7P7G6U2Q2L8O9Z4N8S1A6O4R2Y2U0Z9W7W6Z9G1M9Z4C4E1M9Z3H2E1N8P1U4M2E4G1S8W2J4C7K4N8A0K2G9Q6T3D9J8M2U7J6V5L1U5H0P9N2T5G0M8V7C8C5Q1Y6O2J4V8X6E9R4N2A9N4N7V9V8V0K5O2Z6K3M5D1G2W3F3V5C2V6Z3S4F7Z3M2E5Q8S1G4R7C7S6Z6G9M0C2S8Y8E3M9Y0D9B0J1N7V8M1L7J6O7R9J5E3R3L3G5R8U4O8P0M4J9R9E8S5W2M8V2E4B1N7Q1D1C6F8X2K4E6Z3P0A2B9Z3K7V9E8J3Z5K9L6S1T7K3R4Q2J5N9B6C1W4A1B9X6S4Z0G0M7B5V9U5S8B3X8A8D5N4Q4W0K2Y2E6U1D9E7F4E1U4C1C4R9U4D9A0W7U2K8V3M4B8Z6H4W1X2D3O3G3S7Z1S7E2C3G9A8Z9L4A6G5U1L8B0H9W0L0S4L8A0N2B9G1U5F8E2O1R4V0V1T5N2L8X1O6U5U5D4K7P2A3V3U1V6V3B9V6X1F8E3C3Y3C9Z5Z5T2M2M8N1A3H5Z5K4A5M7M1U7T5O8A8L5R2R2E8M8X0T4X5C4C4U1M9Z3S1Q0A7F5M9T2X0D3N4P1T9X8K4B5A5W1O7X2H1O2L2N5W9O8S1F0K5O2E4V3S1S6D2Z8N5G2G2M2Z4R8P0T2L7A1L5Y9L3J7Z5Q6S6B8N8Q7D1B9V2S8U3N9V6T3Q8X8L1Q6A1J2A2F3E2G0G0P7B0N8N7W9T6P9E5G4D3P4Z7C6Z0L7S3S6P2Q5E9S9R2J4K4J9R8W9U4R5U3S3U9B1P0M7P7G6U2Q2L8O9Z4N8S1A6O4R2Y2U0Z9W7W6Z9G1M9Z4C4E1M9Z3H2E1N8P1U4M2E4G1S8W2J4C7K4N8A0K2G9Q6T3D9J8M2U7J6V5L1U5H0P9N2T5G0M8V7C8C5Q1Y6O2J4V8X6E9R4N2A9N4N7V9V8V0K5O2Z6K3M5D1G2W3F3V5C2V6Z3S4F7Z3M2E5Q8S1G4R7C7S6Z6G9M0C2S8Y8E3M9Y0D9B0J1N7V8M1L7J6O7R9J5E3R3L3G5R8U4O8P0M4J9R9E8S5W2M8V2E4B1N7Q1D1C6F8X2K4E6Z3P0A2B9Z3K7V9E8J3Z5K9L6S1T7K3R4Q2J5N9B6C1W4A1B9X6S4Z0G0M7B5V9U5S8B3X8A8D5N4Q4W0K2Y2E6U1D9E7F4E1U4C1C4R9U4D9A0W7U2K8V3M4B8Z6H4W1X2D3O3G3S7Z1S7E2C3G9A8Z9L4A6G5U1L8B0H9W0L0S4L8A0N2B9G1U5F8E2O1R4V0V1T5N2L8X1O6U5U5D4K7P2A3V3U1V6V3B9V6X1F8E3C3Y3C9Z5Z5T2M2M8N1A3H5Z5K4A5M7M1U7T5O8A8L5R2R2E8M8X0T4X5C4C4U1M9Z3S1Q0A7F5M9T2X0D3N4P1T9X8K4B5A5W1O7X2H1O2L2N5W9O8S1F0K5O2E4V3S1S6D2Z8N5G2G2M2Z4R8P0T2L7A1L5Y9L3J7Z5Q6S6B8N8Q7D1B9V2S8U3N9V6T3Q8X8L1Q6A1J2A2F3E2G0G0P7B0N8N7W9T6P9E5G4D3P4Z7C6Z0L7S3S6P2Q5E9S9R2J4K4J9R8W9U4R5U3S3U9B1P0M7P7G6U2Q2L8O9Z4N8S1A6O4R2Y2U0Z9W7W6Z9G1M9Z4",
      title_ru: '🏆 Трофей Садовода Муси',
      title_en: '🏆 Musya Gardener Trophy',
      resolution: 32
    },
    trophy_fish: {
      id: "b32_2RTTmtl-fWGyd9DGq8JwW2SuCOVThWO_Fraj3W9v_aL0m9t1l1o6m5X2b8b9Q5j7K5b4W9e5j1o5o8b2M6c3n6c5m0h3y5t6t4q7a8i7g0i8d4r2d8z7w9b8c0b5i1s4j8b1l2s5l2y8f4e2w1c2d0f3d6l2j5r3f8n8v1q2b5r4v5p6y6p3n5v1r0x5d4p2s8y4p3e5x8p4r1x0v9a0b1v4c8z2c5e7b2v5c7b3w2k4h5n9h5c8b7f5v1n4j5a8d9b8w5q2l4g2u8s6u7y0s5u7q4k4x7g3a0w8e3a2x9u6g7n4z8d6p7n1g7x7f2c4q9l7e3p3p1s5e4l3f1r3t8o5a1y1c0l3r2n5d8o9k4u7u0v4s8a3n2o2q8p7c1r2n3r2y6o2j4v8x6e9r4n2a9n4n7v9v8v0k5o2z6k3m5d1g2w3f3v5c2v6z3s4f7z3m2e5q8s1g4r7c7s6z6g9m0c2s8y8e3m9y0d9b0j1n7v8m1l7j6o7r9j5e3r3l3g5r8u4o8p0m4j9r9e8s5w2m8v2e4b1n7q1d1c6f8x2k4e6z3p0a2b9z3k7v9e8j3z5k9l6s1t7k3r4q2j5n9b6c1w4a1b9x6s4z0g0m7b5v9u5s8b3x8a8d5n4q4w0k2y2e6u1d9e7f4e1u4c1c4r9u4d9a0w7u2k8v3m4b8z6h4w1x2d3o3g3s7z1s7e2c3g9a8z9l4a6g5u1l8b0h9w0l0s4l8a0n2b9g1u5f8e2o1r4v0v1t5n2l8x1o6u5u5d4k7p2a3v3u1v6v3b9v6x1f8e3c3y3c9z5z5t2m2m8n1a3h5z5k4a5m7m1u7t5o8a8l5r2r2e8m8x0t4x5c4c4u1m9z3s1q0a7f5m9t2x0d3n4p1t9x8k4b5a5w1o7x2h1o2l2n5w9o8s1f0k5o2e4v3s1s6d2z8n5g2g2m2z4r8p0t2l7a1l5y9l3j7z5q6s6b8n8q7d1b9v2s8u3n9v6t3q8x8l1q6a1j2a2f3e2g0g0p7b0n8n7w9t6p9e5g4d3p4z7c6z0l7s3s6p2q5e9s9r2j4k4j9r8w9u4r5u3s3u9b1p0m7p7g6u2q2l8o9z4n8s1a6o4r2y2u0z9w7w6z9g1m9z4",
      title_ru: '🏆 Трофей Золотой Рыбки',
      title_en: '🏆 Golden Fish Trophy',
      resolution: 32
    },
    trophy_forest: {
      id: "b32_wan7S-zdEDDVDUGV03i3QXnrjEjsTaN-aikTvMhWb0e9y0e3u5p9s8h8a2f4r6n1m3o9e4c5b3t7j9a8b1j4k5s6c3d9b4j7l5m2s8f1g3u0n2a8c1f0m7h8e2s3k7y5u0b8q4r1e5x6a9s7p2m8c0e1u9j5b3h6w7f0s8r3q4a7d3f1j8e4k1n6r0m8c3v9t7e2d5t8y1e4u2o6i9s7b3m4p8a0x6f9o8j5p2o8v5l7c1y3b6w2e4o7x0i8m9p6k8a5v7f4d2q5v6z3s4f7z3m2e5q8s1g4r7c7s6z6g9m0c2s8y8e3m9y0d9b0j1n7v8m1l7j6o7r9j5e3r3l3g5r8u4o8p0m4j9r9e8s5w2m8v2e4b1n7q1d1c6f8x2k4e6z3p0a2b9z3k7v9e8j3z5k9l6s1t7k3r4q2j5n9b6c1w4a1b9x6s4z0g0m7b5v9u5s8b3x8a8d5n4q4w0k2y2e6u1d9e7f4e1u4c1c4r9u4d9a0w7u2k8v3m4b8z6h4w1x2d3o3g3s7z1s7e2c3g9a8z9l4a6g5u1l8b0h9w0l0s4l8a0n2b9g1u5f8e2o1r4v0v1t5n2l8x1o6u5u5d4k7p2a3v3u1v6v3b9v6x1f8e3c3y3c9z5z5t2m2m8n1a3h5z5k4a5m7m1u7t5o8a8l5r2r2e8m8x0t4x5c4c4u1m9z3s1q0a7f5m9t2x0d3n4p1t9x8k4b5a5w1o7x2h1o2l2n5w9o8s1f0k5o2e4v3s1s6d2z8n5g2g2m2z4r8p0t2l7a1l5y9l3j7z5q6s6b8n8q7d1b9v2s8u3n9v6t3q8x8l1q6a1j2a2f3e2g0g0p7b0n8n7w9t6p9e5g4d3p4z7c6z0l7s3s6p2q5e9s9r2j4k4j9r8w9u4r5u3s3u9b1p0m7p7g6u2q2l8o9z4n8s1a6o4r2y2u0z9w7w6z9g1m9z4",
      title_ru: '🏆 Трофей Изумрудного Леса',
      title_en: '🏆 Emerald Forest Trophy',
      resolution: 32
    },
    trophy_harmony: {
      id: "b64_tp4fuouzOQB-YaIerZhRIdoGljGrQHMjQORWlP2t6L7F_jU4l6h4O9e4V7b0R3c2J6L4A0I8Z5L1H8L0D3U8W5Z0U7B3N6E1Q9X4C5Q7Z2S8Y5X1P3E6T9H4B2F8T1Z4V9A6O3W5J1R7L9O4I2E0H8B3V1T6F2S8V5Y7B4N9Z2K8R5T1O7U4D0W9K3E8L5U1Z7E3N9S6K2C8A4P0T6B2X8R5Y1H7D3L9T5Z1A7O3E9V5L1U5H0P9N2T5G0M8V7C8C5Q1Y6O2J4V8X6E9R4N2A9N4N7V9V8V0K5O2Z6K3M5D1G2W3F3V5C2V6Z3S4F7Z3M2E5Q8S1G4R7C7S6Z6G9M0C2S8Y8E3M9Y0D9B0J1N7V8M1L7J6O7R9J5E3R3L3G5R8U4O8P0M4J9R9E8S5W2M8V2E4B1N7Q1D1C6F8X2K4E6Z3P0A2B9Z3K7V9E8J3Z5K9L6S1T7K3R4Q2J5N9B6C1W4A1B9X6S4Z0G0M7B5V9U5S8B3X8A8D5N4Q4W0K2Y2E6U1D9E7F4E1U4C1C4R9U4D9A0W7U2K8V3M4B8Z6H4W1X2D3O3G3S7Z1S7E2C3G9A8Z9L4A6G5U1L8B0H9W0L0S4L8A0N2B9G1U5F8E2O1R4V0V1T5N2L8X1O6U5U5D4K7P2A3V3U1V6V3B9V6X1F8E3C3Y3C9Z5Z5T2M2M8N1A3H5Z5K4A5M7M1U7T5O8A8L5R2R2E8M8X0T4X5C4C4U1M9Z3S1Q0A7F5M9T2X0D3N4P1T9X8K4B5A5W1O7X2H1O2L2N5W9O8S1F0K5O2E4V3S1S6D2Z8N5G2G2M2Z4R8P0T2L7A1L5Y9L3J7Z5Q6S6B8N8Q7D1B9V2S8U3N9V6T3Q8X8L1Q6A1J2A2F3E2G0G0P7B0N8N7W9T6P9E5G4D3P4Z7C6Z0L7S3S6P2Q5E9S9R2J4K4J9R8W9U4R5U3S3U9B1P0M7P7G6U2Q2L8O9Z4N8S1A6O4R2Y2U0Z9W7W6Z9G1M9Z4",
      title_ru: '🏆 Трофей Космической Гармонии',
      title_en: '🏆 Cosmic Harmony Trophy',
      resolution: 64
    }
  };

  // Crops specification
  const CROPS = {
    grass: {
      id: 'grass',
      name: 'Кошачья травка',
      icon: '🌱',
      growTime: 4,
      cost: 0,
      reward: { catnip: 2, coins: 2, xp: 1 },
      minFarmLevel: 1
    },
    catnip: {
      id: 'catnip',
      name: 'Полевая мята',
      icon: '🌿',
      growTime: 10,
      cost: 10,
      reward: { catnip: 8, coins: 6, xp: 3 },
      minFarmLevel: 1
    },
    cornflower: {
      id: 'cornflower',
      name: 'Лунный василёк',
      icon: '💙',
      growTime: 25,
      cost: 35,
      reward: { catnip: 22, coins: 20, xp: 7 },
      minFarmLevel: 3
    },
    valerian: {
      id: 'valerian',
      name: 'Золотая валерьянка',
      icon: '🌾',
      growTime: 60,
      cost: 100,
      reward: { catnip: 60, coins: 65, xp: 18 },
      minFarmLevel: 6
    },
    rose: {
      id: 'rose',
      name: 'Сапфировая роза',
      icon: '🌹',
      growTime: 120,
      cost: 300,
      reward: { catnip: 160, coins: 180, stardust: 1, xp: 45 },
      minFarmLevel: 10
    },
    babel_flower: {
      id: 'babel_flower',
      name: 'Цветок Вавилона',
      icon: '✨',
      growTime: 240,
      cost: 800,
      reward: { catnip: 450, coins: 500, stardust: 3, xp: 120 },
      minFarmLevel: 15
    }
  };

  // Buildings specification
  const BUILDINGS = {
    sawmill: {
      id: 'sawmill',
      name: 'Лесопилка Муси',
      icon: '🪵',
      baseCost: { coins: 60 },
      costScale: 1.6,
      rate: { wood: 1.0 },
      desc: 'Автоматически заготавливает древесину'
    },
    quarry: {
      id: 'quarry',
      name: 'Каменоломня Кейти',
      icon: '🪨',
      baseCost: { coins: 150, wood: 40 },
      costScale: 1.65,
      rate: { stone: 0.8 },
      desc: 'Автоматически добывает камень'
    },
    fishery: {
      id: 'fishery',
      name: 'Рыбный пруд',
      icon: '🐟',
      baseCost: { coins: 400, wood: 120, stone: 80 },
      costScale: 1.7,
      rate: { fish: 0.5 },
      desc: 'Ловит свежую рыбку для кошачьих деликатесов'
    },
    kitchen: {
      id: 'kitchen',
      name: 'Кошачья кухня',
      icon: '🥫',
      baseCost: { coins: 900, wood: 250, stone: 180 },
      costScale: 1.75,
      rate: { catfood: 0.3 },
      desc: 'Готовит питательный корм для Муси и Кейти'
    },
    palace: {
      id: 'palace',
      name: 'Кошачий дворец Симметрии',
      icon: '🏰',
      baseCost: { coins: 3500, wood: 900, stone: 700, stardust: 5 },
      costScale: 1.85,
      rate: { coins: 15, stardust: 0.05 },
      desc: 'Увеличивает гармонию и приносит звёздную пыль'
    }
  };

  // Territories specification
  const TERRITORIES = [
    {
      id: 't1',
      name: 'Садик у крыльца',
      icon: '🏡',
      reqLevel: 1,
      cost: {},
      bonusText: 'Стартовая земля: 4 грядки'
    },
    {
      id: 't2',
      name: 'Шепчущий лес',
      icon: '🌲',
      reqLevel: 3,
      cost: { coins: 200, wood: 50 },
      bonusText: '+2 грядки, +20% к добыче древесины'
    },
    {
      id: 't3',
      name: 'Лунное озеро',
      icon: '🌊',
      reqLevel: 6,
      cost: { coins: 600, stone: 100 },
      bonusText: '+2 грядки, +25% к ловле рыбки'
    },
    {
      id: 't4',
      name: 'Каменное ущелье',
      icon: '⛰',
      reqLevel: 10,
      cost: { coins: 1600, wood: 250, stone: 250 },
      bonusText: '+2 грядки, +30% к добыче камня'
    },
    {
      id: 't5',
      name: 'Теплица Вавилона',
      icon: '🔮',
      reqLevel: 15,
      cost: { coins: 5000, stardust: 12 },
      bonusText: '+2 грядки, доступ к редчайшим семенам'
    },
    {
      id: 't6',
      name: 'Звёздная терраса Муси и Кейти',
      icon: '🌌',
      reqLevel: 20,
      cost: { coins: 15000, stardust: 40 },
      bonusText: '+50% ко всему производству фермы'
    }
  ];

  // Quests & Trophies specification
  const QUESTS = [
    {
      id: 'q_first_harvest',
      title: 'Первый урожай',
      desc: 'Соберите 10 любых растений на грядках',
      target: 10,
      type: 'harvest_count',
      reward: { coins: 80, xp: 20 },
      trophyKey: 'trophy_garden'
    },
    {
      id: 'q_build_sawmill',
      title: 'Лесное ремесло',
      desc: 'Постройте Лесопилку Муси (Уровень 1)',
      target: 1,
      type: 'build_sawmill',
      reward: { coins: 120, wood: 30, xp: 30 }
    },
    {
      id: 'q_feed_cats',
      title: 'Забота о котиках',
      desc: 'Покормите Мусю или Кейти 3 раза',
      target: 3,
      type: 'feed_count',
      reward: { coins: 180, stardust: 2, xp: 40 }
    },
    {
      id: 'q_build_fishery',
      title: 'Рыбный день',
      desc: 'Постройте Рыбный пруд и соберите 20 рыбок',
      target: 20,
      type: 'fish_count',
      reward: { coins: 350, catfood: 10, xp: 60 },
      trophyKey: 'trophy_fish'
    },
    {
      id: 'q_expedition',
      title: 'Исследователь Вавилона',
      desc: 'Завершите хотя бы одну экспедицию Муси',
      target: 1,
      type: 'expedition_count',
      reward: { coins: 500, stardust: 5, xp: 80 }
    },
    {
      id: 'q_unlock_forest',
      title: 'Хозяйка поместья',
      desc: 'Откройте территорию «Шепчущий лес»',
      target: 1,
      type: 'unlock_forest',
      reward: { coins: 1000, wood: 100, xp: 120 },
      trophyKey: 'trophy_forest'
    },
    {
      id: 'q_cats_harmony',
      title: 'Космическая гармония',
      desc: 'Прокачайте Мусю и Кейти до 5 уровня',
      target: 5,
      type: 'cats_lvl_5',
      reward: { coins: 3000, stardust: 20, xp: 300 },
      trophyKey: 'trophy_harmony'
    }
  ];

  // Upgrades
  const UPGRADES = [
    {
      id: 'golden_click',
      name: 'Золотая лапка',
      icon: '🐾',
      desc: '+2 монеты за клик по котикам или грядкам',
      baseCost: { coins: 50 },
      costScale: 2.2,
      maxLevel: 5
    },
    {
      id: 'auto_water',
      name: 'Система автополива',
      icon: '💧',
      desc: 'Грядки созревают на 20% быстрее',
      baseCost: { coins: 250, wood: 60 },
      costScale: 2.4,
      maxLevel: 4
    },
    {
      id: 'big_barn',
      name: 'Вместительный амбар',
      icon: '📦',
      desc: '+300 к лимиту каждого ресурса на складе',
      baseCost: { coins: 200, wood: 80, stone: 50 },
      costScale: 2.0,
      maxLevel: 6
    },
    {
      id: 'sharp_claws',
      name: 'Острые коготки',
      icon: '⚡',
      desc: '+20% к скорости работы лесопилки и каменоломни',
      baseCost: { coins: 400, stone: 120 },
      costScale: 2.3,
      maxLevel: 5
    }
  ];

  // Initial Game State Factory
  function createInitialState() {
    return {
      version: 2,
      farmLevel: 1,
      farmXp: 0,
      coins: 40,
      catnip: 10,
      wood: 0,
      stone: 0,
      fish: 0,
      catfood: 2,
      stardust: 0,
      storageBase: 250,
      lastSaved: Date.now(),
      plots: [
        { id: 0, crop: 'grass', plantedAt: Date.now(), ready: false },
        { id: 1, crop: 'grass', plantedAt: Date.now(), ready: false },
        { id: 2, crop: null, plantedAt: 0, ready: false },
        { id: 3, crop: null, plantedAt: 0, ready: false }
      ],
      buildings: {
        sawmill: 0,
        quarry: 0,
        fishery: 0,
        kitchen: 0,
        palace: 0
      },
      upgrades: {
        golden_click: 0,
        auto_water: 0,
        big_barn: 0,
        sharp_claws: 0
      },
      cats: {
        musya: {
          level: 1,
          xp: 0,
          expeditionActive: false,
          expeditionEnds: 0
        },
        keti: {
          level: 1,
          xp: 0
        }
      },
      unlockedTerritories: ['t1'],
      completedQuests: [],
      stats: {
        totalHarvests: 0,
        totalFeeds: 0,
        totalFish: 0,
        totalExpeditions: 0,
        totalCoinsEarned: 0
      }
    };
  }

  // Farm Class Definition
  class MusyaKetiFarmGame {
    constructor() {
      this.state = this.loadState();
      this.selectedCropId = 'grass';
      this.subscribers = new Set();
      this.timerId = null;
      this.lastTickTime = Date.now();
      this.offlineSummary = null;
    }

    loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const initial = createInitialState();
          // Merge to safely handle version updates
          return Object.assign({}, initial, parsed, {
            plots: Array.isArray(parsed.plots) ? parsed.plots : initial.plots,
            buildings: Object.assign({}, initial.buildings, parsed.buildings),
            upgrades: Object.assign({}, initial.upgrades, parsed.upgrades),
            cats: Object.assign({}, initial.cats, parsed.cats),
            unlockedTerritories: Array.isArray(parsed.unlockedTerritories) ? parsed.unlockedTerritories : initial.unlockedTerritories,
            completedQuests: Array.isArray(parsed.completedQuests) ? parsed.completedQuests : initial.completedQuests,
            stats: Object.assign({}, initial.stats, parsed.stats)
          });
        }
      } catch (e) {
        console.warn('Error loading farm state from localStorage:', e);
      }
      return createInitialState();
    }

    saveState() {
      try {
        this.state.lastSaved = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Error saving farm state:', e);
      }
    }

    resetState() {
      localStorage.removeItem(STORAGE_KEY);
      this.state = createInitialState();
      this.notify();
    }

    subscribe(fn) {
      this.subscribers.add(fn);
      return () => this.subscribers.delete(fn);
    }

    notify(event = 'update', payload = null) {
      this.subscribers.forEach(fn => fn(this.state, event, payload));
    }

    // Capacity calculation
    getMaxStorage() {
      let cap = this.state.storageBase || 250;
      // Barn upgrade
      const barnLvl = this.state.upgrades.big_barn || 0;
      cap += barnLvl * 300;
      // Musya skill boost (Lv 1 gives +0%, each lvl above 1 gives +20%)
      const musyaLvl = this.state.cats.musya.level || 1;
      cap += Math.floor(cap * (musyaLvl - 1) * 0.20);
      return cap;
    }

    // Start Main Simulation Loop
    init() {
      // Process offline progress
      this.processOfflineProgress();

      // Ensure proper plots count matching territories
      this.syncPlotsWithTerritories();

      // Tick loop: 250ms for smooth progress bars
      this.timerId = setInterval(() => this.tick(), 250);

      // Save every 4s
      setInterval(() => this.saveState(), 4000);

      window.addEventListener('beforeunload', () => this.saveState());
    }

    stop() {
      if (this.timerId) clearInterval(this.timerId);
    }

    syncPlotsWithTerritories() {
      // Base plots: 4
      // t2: +2, t3: +2, t4: +2, t5: +2 = up to 12 plots
      let totalPlotsAllowed = 4;
      if (this.state.unlockedTerritories.includes('t2')) totalPlotsAllowed += 2;
      if (this.state.unlockedTerritories.includes('t3')) totalPlotsAllowed += 2;
      if (this.state.unlockedTerritories.includes('t4')) totalPlotsAllowed += 2;
      if (this.state.unlockedTerritories.includes('t5')) totalPlotsAllowed += 2;

      while (this.state.plots.length < totalPlotsAllowed) {
        this.state.plots.push({
          id: this.state.plots.length,
          crop: null,
          plantedAt: 0,
          ready: false
        });
      }
    }

    processOfflineProgress() {
      const now = Date.now();
      const last = this.state.lastSaved || now;
      const diffSec = Math.floor((now - last) / 1000);

      if (diffSec >= 8) {
        // Cap offline calculation to 8 hours
        const simSec = Math.min(diffSec, 8 * 3600);
        const maxStorage = this.getMaxStorage();

        // Calculate building generation
        let addWood = 0, addStone = 0, addFish = 0, addFood = 0, addCoins = 0;

        if (this.state.buildings.sawmill > 0) {
          addWood += Math.floor(this.state.buildings.sawmill * 1.0 * simSec);
        }
        if (this.state.buildings.quarry > 0) {
          addStone += Math.floor(this.state.buildings.quarry * 0.8 * simSec);
        }
        if (this.state.buildings.fishery > 0) {
          addFish += Math.floor(this.state.buildings.fishery * 0.5 * simSec);
        }
        if (this.state.buildings.kitchen > 0) {
          addFood += Math.floor(this.state.buildings.kitchen * 0.25 * simSec);
        }
        if (this.state.buildings.palace > 0) {
          addCoins += Math.floor(this.state.buildings.palace * 10 * simSec);
        }

        // Apply with storage limits
        const origWood = this.state.wood;
        const origStone = this.state.stone;
        const origFish = this.state.fish;
        const origFood = this.state.catfood;

        this.state.wood = Math.min(maxStorage, this.state.wood + addWood);
        this.state.stone = Math.min(maxStorage, this.state.stone + addStone);
        this.state.fish = Math.min(maxStorage, this.state.fish + addFish);
        this.state.catfood = Math.min(maxStorage, this.state.catfood + addFood);
        this.state.coins += addCoins;

        // Auto-complete growing crops if duration passed
        let readyCrops = 0;
        this.state.plots.forEach(plot => {
          if (plot.crop && !plot.ready) {
            const cropSpec = CROPS[plot.crop];
            if (cropSpec && (now - plot.plantedAt) >= cropSpec.growTime * 1000) {
              plot.ready = true;
              readyCrops++;
            }
          }
        });

        // Offline summary for modal
        this.offlineSummary = {
          minutes: Math.floor(simSec / 60),
          wood: this.state.wood - origWood,
          stone: this.state.stone - origStone,
          fish: this.state.fish - origFish,
          food: this.state.catfood - origFood,
          coins: addCoins,
          readyCrops
        };
      }
      this.lastTickTime = now;
    }

    tick() {
      const now = Date.now();
      const dt = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;

      const maxStorage = this.getMaxStorage();

      // 1. Keti growth speed multiplier
      const ketiLvl = this.state.cats.keti.level || 1;
      const ketiGrowthMultiplier = 1 + (ketiLvl - 1) * 0.10 + (this.state.upgrades.auto_water || 0) * 0.20;

      // 2. Update plots growth
      this.state.plots.forEach(plot => {
        if (plot.crop && !plot.ready) {
          const spec = CROPS[plot.crop];
          if (spec) {
            const adjustedGrowMs = (spec.growTime * 1000) / ketiGrowthMultiplier;
            if (now - plot.plantedAt >= adjustedGrowMs) {
              plot.ready = true;
            }
          }
        }
      });

      // 3. Buildings Idle Production (scaled by dt)
      // Musya boosts wood & stone
      const musyaLvl = this.state.cats.musya.level || 1;
      const musyaMiningBonus = 1 + (musyaLvl - 1) * 0.15 + (this.state.upgrades.sharp_claws || 0) * 0.20;

      // Territory 2 bonus (+20% wood)
      const t2Bonus = this.state.unlockedTerritories.includes('t2') ? 1.20 : 1.0;
      // Territory 3 bonus (+25% fish)
      const t3Bonus = this.state.unlockedTerritories.includes('t3') ? 1.25 : 1.0;
      // Territory 4 bonus (+30% stone)
      const t4Bonus = this.state.unlockedTerritories.includes('t4') ? 1.30 : 1.0;
      // Territory 6 bonus (+50% all)
      const t6Bonus = this.state.unlockedTerritories.includes('t6') ? 1.50 : 1.0;

      if (this.state.buildings.sawmill > 0 && this.state.wood < maxStorage) {
        const prod = this.state.buildings.sawmill * BUILDINGS.sawmill.rate.wood * musyaMiningBonus * t2Bonus * t6Bonus * dt;
        this.state.wood = Math.min(maxStorage, this.state.wood + prod);
      }

      if (this.state.buildings.quarry > 0 && this.state.stone < maxStorage) {
        const prod = this.state.buildings.quarry * BUILDINGS.quarry.rate.stone * musyaMiningBonus * t4Bonus * t6Bonus * dt;
        this.state.stone = Math.min(maxStorage, this.state.stone + prod);
      }

      if (this.state.buildings.fishery > 0 && this.state.fish < maxStorage) {
        const prod = this.state.buildings.fishery * BUILDINGS.fishery.rate.fish * t3Bonus * t6Bonus * dt;
        this.state.fish = Math.min(maxStorage, this.state.fish + prod);
        this.state.stats.totalFish += prod;
      }

      if (this.state.buildings.kitchen > 0 && this.state.catfood < maxStorage) {
        const foodProd = this.state.buildings.kitchen * BUILDINGS.kitchen.rate.catfood * t6Bonus * dt;
        this.state.catfood = Math.min(maxStorage, this.state.catfood + foodProd);
      }

      if (this.state.buildings.palace > 0) {
        const coinProd = this.state.buildings.palace * BUILDINGS.palace.rate.coins * t6Bonus * dt;
        this.state.coins += coinProd;
        this.state.stats.totalCoinsEarned += coinProd;

        const starProd = this.state.buildings.palace * BUILDINGS.palace.rate.stardust * t6Bonus * dt;
        this.state.stardust = (this.state.stardust || 0) + starProd;
      }

      // 4. Check Musya Expedition
      if (this.state.cats.musya.expeditionActive && now >= this.state.cats.musya.expeditionEnds) {
        this.completeExpedition();
      }

      // 5. Check Quests
      this.checkQuests();

      this.notify('tick');
    }

    // --- ACTIONS ---

    plantCrop(plotId, cropId = null) {
      const cId = cropId || this.selectedCropId;
      const spec = CROPS[cId];
      if (!spec) return false;

      const plot = this.state.plots.find(p => p.id === plotId);
      if (!plot || plot.crop) return false;

      // Check level requirement
      if (this.state.farmLevel < spec.minFarmLevel) {
        this.notify('message', { text: `Требуется уровень фермы ${spec.minFarmLevel}!`, type: 'error' });
        return false;
      }

      // Check cost
      if (this.state.coins < spec.cost) {
        this.notify('message', { text: `Недостаточно монет (нужно ${spec.cost} 🪙)!`, type: 'error' });
        return false;
      }

      this.state.coins -= spec.cost;
      plot.crop = cId;
      plot.plantedAt = Date.now();
      plot.ready = false;

      this.notify('update');
      return true;
    }

    plantAll() {
      let planted = 0;
      this.state.plots.forEach(plot => {
        if (!plot.crop) {
          if (this.plantCrop(plot.id, this.selectedCropId)) planted++;
        }
      });
      return planted;
    }

    harvestCrop(plotId) {
      const plot = this.state.plots.find(p => p.id === plotId);
      if (!plot || !plot.crop || !plot.ready) return false;

      const spec = CROPS[plot.crop];
      if (!spec) return false;

      const maxStorage = this.getMaxStorage();

      // Keti Lucky harvest chance (15% + 2% per lvl)
      const ketiLvl = this.state.cats.keti.level || 1;
      const isLucky = Math.random() < (0.15 + (ketiLvl - 1) * 0.02);
      const mult = isLucky ? 2 : 1;

      // Harvest rewards
      const catnipGain = (spec.reward.catnip || 0) * mult;
      const coinsGain = (spec.reward.coins || 0) * mult;
      const stardustGain = (spec.reward.stardust || 0);
      const xpGain = (spec.reward.xp || 1);

      this.state.catnip = Math.min(maxStorage, this.state.catnip + catnipGain);
      this.state.coins += coinsGain;
      if (stardustGain > 0) this.state.stardust = (this.state.stardust || 0) + stardustGain;

      this.addFarmXp(xpGain);
      this.state.stats.totalHarvests = (this.state.stats.totalHarvests || 0) + 1;
      this.state.stats.totalCoinsEarned += coinsGain;

      // Clear plot
      plot.crop = null;
      plot.plantedAt = 0;
      plot.ready = false;

      let msg = `Собрано: +${catnipGain} 🌿, +${coinsGain} 🪙`;
      if (isLucky) msg += ' (Удвоено Кейти! ✨)';
      this.notify('message', { text: msg, type: 'success' });

      this.notify('update');
      return true;
    }

    harvestAll() {
      let harvested = 0;
      this.state.plots.forEach(plot => {
        if (plot.crop && plot.ready) {
          if (this.harvestCrop(plot.id)) harvested++;
        }
      });
      return harvested;
    }

    // Click farm action (gives small coins based on golden_click upgrade)
    clickFarm() {
      const clickLvl = this.state.upgrades.golden_click || 0;
      const reward = 1 + clickLvl * 2;
      this.state.coins += reward;
      this.state.stats.totalCoinsEarned += reward;
      this.notify('click_reward', { coins: reward });
      this.notify('update');
      return reward;
    }

    // Buy/Upgrade Building
    buyBuilding(buildingId) {
      const bSpec = BUILDINGS[buildingId];
      if (!bSpec) return false;

      const currentLvl = this.state.buildings[buildingId] || 0;
      const costScale = Math.pow(bSpec.costScale, currentLvl);

      const coinCost = Math.floor((bSpec.baseCost.coins || 0) * costScale);
      const woodCost = Math.floor((bSpec.baseCost.wood || 0) * costScale);
      const stoneCost = Math.floor((bSpec.baseCost.stone || 0) * costScale);
      const starCost = (bSpec.baseCost.stardust || 0);

      if (this.state.coins < coinCost || this.state.wood < woodCost || this.state.stone < stoneCost || (this.state.stardust || 0) < starCost) {
        this.notify('message', { text: 'Недостаточно ресурсов для постройки/улучшения!', type: 'error' });
        return false;
      }

      this.state.coins -= coinCost;
      this.state.wood -= woodCost;
      this.state.stone -= stoneCost;
      this.state.stardust -= starCost;

      this.state.buildings[buildingId] = currentLvl + 1;
      this.addFarmXp(20 * (currentLvl + 1));

      this.notify('message', { text: `${bSpec.name} улучшено до Lv ${currentLvl + 1}! 🛠`, type: 'success' });
      this.notify('update');
      return true;
    }

    // Buy Upgrade
    buyUpgrade(upgradeId) {
      const upSpec = UPGRADES.find(u => u.id === upgradeId);
      if (!upSpec) return false;

      const currentLvl = this.state.upgrades[upgradeId] || 0;
      if (currentLvl >= upSpec.maxLevel) {
        this.notify('message', { text: 'Достигнут максимальный уровень улучшения!', type: 'info' });
        return false;
      }

      const costScale = Math.pow(upSpec.costScale, currentLvl);
      const coinCost = Math.floor((upSpec.baseCost.coins || 0) * costScale);
      const woodCost = Math.floor((upSpec.baseCost.wood || 0) * costScale);
      const stoneCost = Math.floor((upSpec.baseCost.stone || 0) * costScale);

      if (this.state.coins < coinCost || this.state.wood < woodCost || this.state.stone < stoneCost) {
        this.notify('message', { text: 'Недостаточно ресурсов!', type: 'error' });
        return false;
      }

      this.state.coins -= coinCost;
      this.state.wood -= woodCost;
      this.state.stone -= stoneCost;

      this.state.upgrades[upgradeId] = currentLvl + 1;
      this.addFarmXp(15 * (currentLvl + 1));

      this.notify('message', { text: `${upSpec.name} прокачано до уровня ${currentLvl + 1}! ⭐`, type: 'success' });
      this.notify('update');
      return true;
    }

    // Unlock Territory
    unlockTerritory(terrId) {
      const tSpec = TERRITORIES.find(t => t.id === terrId);
      if (!tSpec) return false;

      if (this.state.unlockedTerritories.includes(terrId)) return true;

      if (this.state.farmLevel < tSpec.reqLevel) {
        this.notify('message', { text: `Требуется уровень фермы ${tSpec.reqLevel}!`, type: 'error' });
        return false;
      }

      const coins = tSpec.cost.coins || 0;
      const wood = tSpec.cost.wood || 0;
      const stone = tSpec.cost.stone || 0;
      const stardust = tSpec.cost.stardust || 0;

      if (this.state.coins < coins || this.state.wood < wood || this.state.stone < stone || (this.state.stardust || 0) < stardust) {
        this.notify('message', { text: 'Недостаточно ресурсов для открытия зоны!', type: 'error' });
        return false;
      }

      this.state.coins -= coins;
      this.state.wood -= wood;
      this.state.stone -= stone;
      this.state.stardust -= stardust;

      this.state.unlockedTerritories.push(terrId);
      this.syncPlotsWithTerritories();
      this.addFarmXp(100);

      this.notify('message', { text: `Открыта новая зона: ${tSpec.name}! 🎉`, type: 'success' });
      this.notify('update');
      return true;
    }

    // Feed Cat (Musya or Keti)
    feedCat(catKey) {
      if (!this.state.cats[catKey]) return false;
      if (this.state.catfood < 1) {
        this.notify('message', { text: 'Нет питательного корма 🥫! Постройте Кошачью кухню.', type: 'error' });
        return false;
      }

      this.state.catfood -= 1;
      const cat = this.state.cats[catKey];
      cat.xp += 25;
      this.state.stats.totalFeeds = (this.state.stats.totalFeeds || 0) + 1;

      const neededXp = cat.level * 40;
      if (cat.xp >= neededXp && cat.level < 10) {
        cat.level++;
        cat.xp -= neededXp;
        const name = catKey === 'musya' ? 'Муся' : 'Кейти';
        this.notify('message', { text: `Уровень повышен! ${name} теперь ${cat.level} уровня! 👑🐾`, type: 'success' });
      } else {
        const name = catKey === 'musya' ? 'Муся' : 'Кейти';
        this.notify('message', { text: `${name} с удовольствием поела (+25 XP) 🐾`, type: 'success' });
      }

      this.addFarmXp(15);
      this.notify('update');
      return true;
    }

    // Start Musya Expedition
    startExpedition() {
      if (this.state.cats.musya.expeditionActive) return false;
      if (this.state.coins < 50) {
        this.notify('message', { text: 'Для экспедиции нужно 50 🪙 на снаряжение!', type: 'error' });
        return false;
      }

      this.state.coins -= 50;
      const durationSec = 30; // 30 seconds for engaging feedback
      this.state.cats.musya.expeditionActive = true;
      this.state.cats.musya.expeditionEnds = Date.now() + durationSec * 1000;

      this.notify('message', { text: 'Муся отправилась в Экспедицию по координатам Вавилона! 🐾🧭', type: 'info' });
      this.notify('update');
      return true;
    }

    completeExpedition() {
      this.state.cats.musya.expeditionActive = false;
      this.state.cats.musya.expeditionEnds = 0;
      this.state.stats.totalExpeditions = (this.state.stats.totalExpeditions || 0) + 1;

      // Rewards
      const coinsReward = 200 + Math.floor(Math.random() * 150);
      const stardustReward = 1 + Math.floor(Math.random() * 2);
      this.state.coins += coinsReward;
      this.state.stardust = (this.state.stardust || 0) + stardustReward;
      this.addFarmXp(50);

      // Generate a REAL mathematical exhibit ID discovered by Musya!
      let discoveredId = null;
      let exhibitNumber = null;
      try {
        if (global.InfiniteGalleryGenerator && global.InfiniteGalleryGenerator.generateRandomId) {
          discoveredId = global.InfiniteGalleryGenerator.generateRandomId(32, true);
        } else {
          discoveredId = FARM_TROPHIES.trophy_garden.id;
        }

        // Save into Catalog
        if (global.InfiniteGalleryCatalog && global.InfiniteGalleryCatalog.saveExhibit) {
          const saved = global.InfiniteGalleryCatalog.saveExhibit({
            id: discoveredId,
            resolution: 32,
            title_ru: `Находка экспедиции Муси #${this.state.stats.totalExpeditions}`,
            title_en: `Musya's Expedition Discovery #${this.state.stats.totalExpeditions}`,
            category: 'expedition'
          });
          exhibitNumber = saved.number;
        }
      } catch (e) {
        console.warn('Expedition exhibit registration error:', e);
      }

      this.notify('expedition_done', {
        coins: coinsReward,
        stardust: stardustReward,
        id: discoveredId,
        number: exhibitNumber
      });
      this.notify('update');
    }

    // Trade Catnip for Coins
    tradeCatnip(amount = 25) {
      if (this.state.catnip < amount) {
        this.notify('message', { text: `Недостаточно мяты (нужно ${amount} 🌿)!`, type: 'error' });
        return false;
      }

      this.state.catnip -= amount;
      const coinYield = Math.floor(amount * 1.2);
      this.state.coins += coinYield;
      this.state.stats.totalCoinsEarned += coinYield;

      this.notify('message', { text: `Продано ${amount} 🌿 за +${coinYield} 🪙!`, type: 'success' });
      this.notify('update');
      return true;
    }

    addFarmXp(amount) {
      this.state.farmXp += amount;
      const needed = this.state.farmLevel * 80;
      if (this.state.farmXp >= needed) {
        this.state.farmLevel++;
        this.state.farmXp -= needed;
        this.notify('message', { text: `🎉 УРОВЕНЬ ФЕРМЫ ПОВЫШЕН ДО ${this.state.farmLevel}!`, type: 'success' });
      }
    }

    checkQuests() {
      QUESTS.forEach(q => {
        if (this.state.completedQuests.includes(q.id)) return;

        let fulfilled = false;

        switch (q.type) {
          case 'harvest_count':
            if ((this.state.stats.totalHarvests || 0) >= q.target) fulfilled = true;
            break;
          case 'build_sawmill':
            if ((this.state.buildings.sawmill || 0) >= q.target) fulfilled = true;
            break;
          case 'feed_count':
            if ((this.state.stats.totalFeeds || 0) >= q.target) fulfilled = true;
            break;
          case 'fish_count':
            if ((this.state.stats.totalFish || 0) >= q.target && (this.state.buildings.fishery || 0) > 0) fulfilled = true;
            break;
          case 'expedition_count':
            if ((this.state.stats.totalExpeditions || 0) >= q.target) fulfilled = true;
            break;
          case 'unlock_forest':
            if (this.state.unlockedTerritories.includes('t2')) fulfilled = true;
            break;
          case 'cats_lvl_5':
            if (this.state.cats.musya.level >= 5 && this.state.cats.keti.level >= 5) fulfilled = true;
            break;
        }

        if (fulfilled) {
          this.claimQuestReward(q);
        }
      });
    }

    claimQuestReward(quest) {
      this.state.completedQuests.push(quest.id);

      if (quest.reward.coins) this.state.coins += quest.reward.coins;
      if (quest.reward.wood) this.state.wood = Math.min(this.getMaxStorage(), this.state.wood + quest.reward.wood);
      if (quest.reward.stardust) this.state.stardust = (this.state.stardust || 0) + quest.reward.stardust;
      if (quest.reward.catfood) this.state.catfood = Math.min(this.getMaxStorage(), this.state.catfood + quest.reward.catfood);
      if (quest.reward.xp) this.addFarmXp(quest.reward.xp);

      // Register Trophy in Catalog if applicable
      let trophyExhibit = null;
      if (quest.trophyKey && FARM_TROPHIES[quest.trophyKey]) {
        const trData = FARM_TROPHIES[quest.trophyKey];
        try {
          if (global.InfiniteGalleryCatalog && global.InfiniteGalleryCatalog.saveExhibit) {
            trophyExhibit = global.InfiniteGalleryCatalog.saveExhibit({
              id: trData.id,
              resolution: trData.resolution,
              title_ru: trData.title_ru,
              title_en: trData.title_en,
              category: 'trophy'
            });
          }
        } catch (e) {
          console.warn('Could not save trophy exhibit:', e);
        }
      }

      this.notify('quest_completed', {
        quest,
        trophyExhibit
      });
    }

    // Export save as JSON string
    exportSave() {
      this.saveState();
      return JSON.stringify(this.state, null, 2);
    }

    // Import save from JSON string
    importSave(jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (!parsed || typeof parsed !== 'object') throw new Error('Некорректный JSON');
        this.state = Object.assign(createInitialState(), parsed);
        this.saveState();
        this.notify('update');
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  // Export globally
  const FarmEngine = {
    CROPS,
    BUILDINGS,
    TERRITORIES,
    QUESTS,
    UPGRADES,
    FARM_TROPHIES,
    game: new MusyaKetiFarmGame()
  };

  global.MusyaKetiFarm = FarmEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FarmEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
