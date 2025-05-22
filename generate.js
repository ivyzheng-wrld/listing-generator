const Database = require('better-sqlite3-multiple-ciphers')

//connect to db
//change the path
//make the key
const db = new Database('ENTER PATH TO DB HERE', { fileMustExist: true })
db.pragma(`key = 'ENTER KEY HERE'`)

//Helpers
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randomTitle() {
    const adjectives = ['Cool', 'Vintage', 'Modern', 'Rare', 'Useful', 'Stylish']
    const items = ['Lamp', 'Chair', 'Backpack', 'T-shirt', 'Keyboard', 'Book']
    return `${randomChoice(adjectives)} ${randomChoice(items)}`
}

function randomUrl(title) {
    const links = ['https://youtube.com', 'https://google.com', 'https://cuny.edu']
    return randomChoice(links)
}

function fakeUPC() {
    return Math.floor(100000000000 + Math.random() * 900000000000)
}

function fakePrice() {
    return parseFloat((Math.random() * 100 + 5).toFixed(2))
}

function randomDate(start = new Date(2023, 0, 1), end = new Date()) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    return date.toISOString().slice(0, 19).replace('T', ' ') // 'YYYY-MM-DD HH:MM:SS'
}

function randomDateAfter(dateStr) {
    const baseDate = new Date(dateStr)
    const endDate = new Date()
    const future = new Date(baseDate.getTime() + Math.random() * (endDate.getTime() - baseDate.getTime()))
    return future.toISOString().slice(0, 19).replace('T', ' ')
}

//3. Main function
function createFakeListings(count) {
    try {
        const statuses = db.prepare(`SELECT id, status FROM L_Listing_Status`).all()
        const platforms = db.prepare(`SELECT platform_id, name FROM L_Platforms`).all()

        const insertItem = db.prepare(`INSERT INTO Items (onEbay, onEtsy, onShopify) VALUES (?, ?, ?)`)

        const insertListing = db.prepare(`
            INSERT INTO Listings (
                item_id, platform_id, external_listing, status_id,
                price, url, created_at, date_sold
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const insertEbay = db.prepare(`
            INSERT INTO Ebay (item_id, listing_id, title, description, upc, condition, quantity, url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const insertEtsy = db.prepare(`
            INSERT INTO Etsy (item_id, listing_id, title, url)
            VALUES (?, ?, ?, ?)
        `)

        const insertShopify = db.prepare(`
            INSERT INTO Shopify (item_id, listing_id, title, description, upc, condition, quantity, shopifyURL)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const tx = db.transaction(() => {
            for (let i = 0; i < count; i++) {
                const platform = randomChoice(platforms)
                const status = randomChoice(statuses)
                const title = randomTitle()
                const url = randomUrl(title)
                const upc = fakeUPC()
                const price = fakePrice()
                const quantity = getRandomInt(1, 10)

                const createdAt = randomDate()
                const dateSold = status.status.toLowerCase() === 'sold' ? randomDateAfter(createdAt) : null

                const itemResult = insertItem.run(
                    platform.name === 'Ebay' ? 1 : 0,
                    platform.name === 'Etsy' ? 1 : 0,
                    platform.name === 'Shopify' ? 1 : 0
                )
                const itemId = itemResult.lastInsertRowid

                const listingResult = insertListing.run(
                    itemId,
                    platform.platform_id,
                    `EXT-${itemId}-${platform.name}`,
                    status.id,
                    price,
                    url,
                    createdAt,
                    dateSold
                )
                const listingId = listingResult.lastInsertRowid

                if (platform.name === 'Ebay') {
                    insertEbay.run(itemId, listingId, title, "Great item, must have!", upc, "New", quantity, url)
                } else if (platform.name === 'Etsy') {
                    insertEtsy.run(itemId, listingId, title, url)
                } else if (platform.name === 'Shopify') {
                    insertShopify.run(itemId, listingId, title, "Stylish and affordable", upc, "New", quantity, url)
                }
            }
        })

        tx()
        return { success: true }
    } catch (err) {
        return { success: false, error: err.message }
    }
}

//run
const result = createFakeListings(50)
console.log(result.success ? "created 50 fake listings!" : `Failed: ${result.error}`)
