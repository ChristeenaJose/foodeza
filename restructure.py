import re

# Read files
with open('foodtruck/index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()
    
with open('foodtruck/mittagessen.html', 'r', encoding='utf-8') as f:
    mittag_html = f.read()

# Extract simple gallery from index.html
start_marker = "<!-- Our Food Gallery Section -->"
gallery_match = re.search(r'(<!-- Our Food Gallery Section -->\s*<section id="our-food".*?\s*</div>\s*</section>)', index_html, re.DOTALL)
if not gallery_match:
    print("Gallery block not found in index")
    exit(1)
gallery_block_simple = gallery_match.group(1)

# But wait, in index.html, there is:
# <div class="mt-5 text-center reveal">
#  <a href="mittagessen.html" ...>Wochenkarte & Vorbestellen</a>
# </div>
# We want to remove that button from the simple gallery block since we are ALREADY on mittagessen.html
gallery_block_simple = re.sub(r'<div class="mt-5 text-center reveal">\s*<a href="mittagessen.html".*?</div>', '', gallery_block_simple, flags=re.DOTALL)

# Build the new Ordering Grid
new_order_grid = """
      <!-- Preorder List -->
      <div class="preorder-section mt-5 reveal" style="max-width: 800px; margin: 0 auto;">
        <h3 class="text-center mb-4" style="font-weight: 800; font-size: 1.8rem; color: #1a1a1a;">Jetzt Vorbestellen</h3>
        
        <!-- Item 1 -->
        <div class="bg-white rounded-4 shadow-sm border p-3 p-md-4 mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
             <h4 class="mb-0 fw-bold fs-5 text-dark">Rice mit Curry</h4>
             <span class="badge bg-danger text-white rounded-pill px-3 py-2 fs-6 shadow-sm">8,50 €</span>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-3">
             <div class="variant-label"><i style="background: #E02828;"></i> Non-Veg</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('rice_nv', -1, 8.5)">&minus;</button>
                <span class="qty-number" id="qty-rice_nv">0</span>
                <button class="qty-btn plus" onclick="updateQty('rice_nv', 1, 8.5)">+</button>
             </div>
          </div>
          <div class="d-flex justify-content-between align-items-center">
             <div class="variant-label"><i style="background: #2E7D32;"></i> Vegetarisch</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('rice_v', -1, 8.5)">&minus;</button>
                <span class="qty-number" id="qty-rice_v">0</span>
                <button class="qty-btn plus" onclick="updateQty('rice_v', 1, 8.5)">+</button>
             </div>
          </div>
        </div>

        <!-- Item 2 -->
        <div class="bg-white rounded-4 shadow-sm border p-3 p-md-4 mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
             <h4 class="mb-0 fw-bold fs-5 text-dark">Porotta (Brot) mit Curry</h4>
             <span class="badge bg-danger text-white rounded-pill px-3 py-2 fs-6 shadow-sm">8,50 €</span>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-3">
             <div class="variant-label"><i style="background: #E02828;"></i> Non-Veg</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('porotta_brot_nv', -1, 8.5)">&minus;</button>
                <span class="qty-number" id="qty-porotta_brot_nv">0</span>
                <button class="qty-btn plus" onclick="updateQty('porotta_brot_nv', 1, 8.5)">+</button>
             </div>
          </div>
          <div class="d-flex justify-content-between align-items-center">
             <div class="variant-label"><i style="background: #2E7D32;"></i> Vegetarisch</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('porotta_brot_v', -1, 8.5)">&minus;</button>
                <span class="qty-number" id="qty-porotta_brot_v">0</span>
                <button class="qty-btn plus" onclick="updateQty('porotta_brot_v', 1, 8.5)">+</button>
             </div>
          </div>
        </div>

        <!-- Item 3 -->
        <div class="bg-white rounded-4 shadow-sm border p-3 p-md-4 mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
             <h4 class="mb-0 fw-bold fs-5 text-dark">Südindisches Brot Wrap</h4>
             <span class="badge bg-danger text-white rounded-pill px-3 py-2 fs-6 shadow-sm">8,50 €</span>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-3">
             <div class="variant-label"><i style="background: #E02828;"></i> Non-Veg</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('wrap_nv', -1, 8.5)">&minus;</button>
                <span class="qty-number" id="qty-wrap_nv">0</span>
                <button class="qty-btn plus" onclick="updateQty('wrap_nv', 1, 8.5)">+</button>
             </div>
          </div>
          <div class="d-flex justify-content-between align-items-center">
             <div class="variant-label"><i style="background: #2E7D32;"></i> Vegetarisch</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('wrap_v', -1, 8.5)">&minus;</button>
                <span class="qty-number" id="qty-wrap_v">0</span>
                <button class="qty-btn plus" onclick="updateQty('wrap_v', 1, 8.5)">+</button>
             </div>
          </div>
        </div>

        <!-- Item 4 -->
        <div class="bg-white rounded-4 shadow-sm border p-3 p-md-4 mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
             <h4 class="mb-0 fw-bold fs-5 text-dark">Kleiner Wrap + Getränke</h4>
             <span class="badge bg-danger text-white rounded-pill px-3 py-2 fs-6 shadow-sm">8,50 €</span>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-3">
             <div class="variant-label"><i style="background: #E02828;"></i> Non-Veg</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('combo_nv', -1, 8.5)">&minus;</button>
                <span class="qty-number" id="qty-combo_nv">0</span>
                <button class="qty-btn plus" onclick="updateQty('combo_nv', 1, 8.5)">+</button>
             </div>
          </div>
          <div class="d-flex justify-content-between align-items-center">
             <div class="variant-label"><i style="background: #2E7D32;"></i> Vegetarisch</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('combo_v', -1, 8.5)">&minus;</button>
                <span class="qty-number" id="qty-combo_v">0</span>
                <button class="qty-btn plus" onclick="updateQty('combo_v', 1, 8.5)">+</button>
             </div>
          </div>
        </div>

        <!-- Item 5: Drinks -->
        <div class="bg-white rounded-4 shadow-sm border p-3 p-md-4 mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
             <h4 class="mb-0 fw-bold fs-5 text-dark">Erfrischungen</h4>
             <span class="badge bg-warning text-dark rounded-pill px-3 py-2 fs-6 fw-bold shadow-sm">Getränke</span>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-3">
             <div class="variant-label"><i style="background: #fbbf24;"></i> Mango Lassi (3,00 €)</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('lassi', -1, 3.0)">&minus;</button>
                <span class="qty-number" id="qty-lassi">0</span>
                <button class="qty-btn plus" onclick="updateQty('lassi', 1, 3.0)">+</button>
             </div>
          </div>
          <div class="d-flex justify-content-between align-items-center">
             <div class="variant-label"><i style="background: #2E7D32;"></i> Mango Saft Vegan (2,50 €)</div>
             <div class="quantity-selector">
                <button class="qty-btn minus" onclick="updateQty('juice', -1, 2.5)">&minus;</button>
                <span class="qty-number" id="qty-juice">0</span>
                <button class="qty-btn plus" onclick="updateQty('juice', 1, 2.5)">+</button>
             </div>
          </div>
        </div>
      </div>
"""

# Find the end of weekly menu card
# It's at:
#           </div>
#         </div>
#       </div>
#     </div>
#     <div class="mt-5 text-center reveal">
#       <a href="../files/menu-foodtruck.pdf" ...

# Let's cleanly replace the complex "Unsere Speisen" section first
mittag_html = re.sub(r'<!-- Our Food Gallery Section -->.*?</section>', gallery_block_simple, mittag_html, flags=re.DOTALL)

# Now inject the new order grid right before the PDF section
insert_target = r'(      </div>\n    </div>\n    \n    <div class="mt-5 text-center reveal">\n      <a href="\.\./files/menu-foodtruck\.pdf")'
mittag_html = re.sub(insert_target, new_order_grid + r'\n\1', mittag_html)

with open('foodtruck/mittagessen.html', 'w', encoding='utf-8') as f:
    f.write(mittag_html)

print("Restructure complete")
