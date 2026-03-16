const BASE_ID = process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID!;
const TOKEN = process.env.EXPO_PUBLIC_AIRTABLE_TOKEN!;

const AIRTABLE_API = `https://api.airtable.com/v0/${BASE_ID}`;

async function airtableFetch(
  table: string,
  params: Record<string, string> = {},
) {
  const search = new URLSearchParams(params).toString();
  const url = `${AIRTABLE_API}/${encodeURIComponent(table)}${search ? `?${search}` : ""}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  if (!res.ok) {
    console.error(await res.text());
    throw new Error(`Airtable error: ${res.status}`);
  }

  const data = await res.json();
  return data.records as any[];
}

export const Airtable = {
  listEvents: () => airtableFetch("MS99", { view: "Grid view" }),
  listArtists: () => airtableFetch("Mākslinieki", { view: "Grid view" }),
  listMarkers: () => airtableFetch("Kartes_markieri", { view: "Grid view" }),
};
