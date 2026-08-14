const fs = require('fs')
const { PNG } = require('pngjs')

function samplePng(path) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(path)
            .pipe(new PNG())
            .on('parsed', function () {
                let r = 0, g = 0, b = 0, a = 0, count = 0
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const idx = (this.width * y + x) << 2
                        const alpha = this.data[idx + 3]
                        if (alpha === 0) continue
                        r += this.data[idx]
                        g += this.data[idx + 1]
                        b += this.data[idx + 2]
                        a += alpha
                        count++
                    }
                }
                if (count === 0) return resolve(null)
                r = Math.round(r / count)
                g = Math.round(g / count)
                b = Math.round(b / count)
                a = Math.round(a / count)
                resolve({ path, rgb: { r, g, b }, rgba: { r, g, b, a } })
            })
            .on('error', reject)
    })
}

async function main() {
    const args = process.argv.slice(2)
    if (args.length === 0) {
        console.error('Usage: node sample_theme.js <png1> [png2 ...]')
        process.exit(2)
    }

    const results = []
    for (const p of args) {
        if (!fs.existsSync(p)) {
            console.error('Missing file', p)
            continue
        }
        try {
            const r = await samplePng(p)
            results.push(r)
        } catch (e) {
            console.error('Error parsing', p, e.message)
        }
    }
    console.log(JSON.stringify(results, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
