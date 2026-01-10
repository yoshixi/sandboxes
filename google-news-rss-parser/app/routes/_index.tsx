import type { MetaFunction } from "@remix-run/cloudflare";
import { useEffect, useState } from "react";
import { XMLParser } from "fast-xml-parser";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

const xp = new XMLParser();

export default function Index() {
  const [links, setLinks] = useState([]);
  const rssUrl = "https://news.ycombinator.com/rss";

  useEffect(() => {
    fetch("https://news.ycombinator.com/rss", {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "sec-ch-ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "omit",
    })
      .then((response) => response.text())
      .then((str) => {
        console.log(str);
        const jsonObj = xp.parse(str);
        console.log(jsonObj);

        // const items = jsonObj.rss.channel.item;
        // const extractedLinks = items.map((item) => item.link);
        // setLinks(extractedLinks);
      })
      .catch((error) => console.log("Fetch error:", error));
  }, []);

  return (
    <div>
      {links.map((link, index) => (
        <div key={index}>
          <a href={link} target="_blank" rel="noopener noreferrer">
            {link}
          </a>
        </div>
      ))}
    </div>
  );
}
