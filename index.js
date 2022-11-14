const axios = require("axios");
const fs = require("fs/promises");
const cheerio = require("cheerio");
const { Feed } = require("feed");

const PAGE_URL = "https://www.indiehackers.com";

async function requestPage() {
  const response = await axios.get(PAGE_URL);
  return response.data;
}

async function getPage() {
  const filename = "page.html";
  const exists = await fs.stat(filename).catch(() => false);

  if (!exists) {
    const page = await requestPage();
    await fs.writeFile(filename, page);

    return page;
  }

  return fs.readFile(filename, "utf8");
}

async function pageToFeedItems(documentString) {
  const $ = cheerio.load(documentString);

  const queryToItem = function (_, item) {
    const titleLink = $(item).find(".feed-item__title-link");
    const title = titleLink.text().trim();
    const link = `${PAGE_URL}${titleLink.attr("href")}`;
    const image = $(item)
      .find(".user-link__avatar [type=image/jpeg]")
      .attr("srcset");
    const author = {
      name: $(item).find(".user-link__name--username").text().trim(),
    };

    return { title, link, image, author };
  };

  const feedItems = $(".feed-item").map(queryToItem).toArray();

  return feedItems;
}

async function mainAsync() {
  const docString = await requestPage();
  const feedItems = await pageToFeedItems(docString);

  // TODO: move to config
  const rssFeed = new Feed({
    title: "IndieHackers",
    description: "IdieHackers Popular Today",
    id: PAGE_URL,
    link: PAGE_URL,
    image: `${PAGE_URL}/images/logos/apple-touch-icon.png`,
    favicon: `${PAGE_URL}/images/favicons/favicon--32x32.ico`,
  });

  feedItems.forEach((item) => {
    rssFeed.addItem(item);
  });

  return rssFeed.rss2();
}

function main() {
  return mainAsync();
}

main().then(console.log).catch(console.error);
