const API_URL = "https://septembertotseptember.nl/geocache/geocacheapi/";

async function fetchLocations() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("API response was not ok");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fout bij ophalen van locaties:", error);
    return [];
  }
}