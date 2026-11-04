from PIL import Image

src = r"C:\Users\Ibn Abdullah\.cursor\projects\d-ZOOMIT-SalesFast\assets\image-51df6885-6ef2-4114-a48e-82dba5ef8318.png"
dst = r"d:\ZOOMIT\SalesFast\salesfast.app\assets\images\quick-actions\search.png"

im = Image.open(src).convert("RGBA")
pixels = im.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if r < 40 and g < 40 and b < 40:
            pixels[x, y] = (0, 0, 0, 0)
im.save(dst, "PNG")
print("saved", dst, im.size)
