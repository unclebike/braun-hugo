/** @jsx jsx */
import { jsx } from 'hono/jsx';
import { Layout } from './layout';

void jsx;

export const BrandingPage = ({ primaryColor }: { primaryColor: string }) => {
  const initialColor = /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : '#2563eb';

  return (
    <Layout title="Branding">
      <div class="flex items-center justify-between px-4 pl-14 py-4 md:px-8 md:pl-8 md:py-5 bg-white border-b border-border sticky top-0 z-50">
        <h2 class="text-xl font-semibold">Branding</h2>
      </div>

      <div class="p-8">
        <div class="uk-card uk-card-body">
          <section id="branding-settings">
            <form
              class="autosave"
              hx-post="/admin/branding"
              hx-swap="none"
              hx-trigger="input delay:500ms, change"
              hx-sync="this:queue last"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-semibold">Widget Appearance</h3>
                <span class="save-indicator"></span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-end">
                <div class="grid gap-2">
                  <label class="uk-form-label" for="widget-primary-color">Widget Primary Colour</label>
                  <input
                    id="widget-primary-color"
                    name="primaryColor"
                    type="color"
                    class="uk-input"
                    value={initialColor}
                  />
                </div>

                <div class="grid gap-2">
                  <label class="uk-form-label" for="widget-primary-color-text">Hex Value</label>
                  <input
                    id="widget-primary-color-text"
                    type="text"
                    class="uk-input"
                    value={initialColor}
                    inputmode="text"
                    maxlength={7}
                    pattern="^#[0-9a-fA-F]{6}$"
                  />
                </div>
              </div>

              <div class="mt-6 grid gap-3">
                <span class="uk-form-label mb-0">Live Preview</span>
                <button
                  id="widget-primary-color-preview"
                  type="button"
                  class="uk-btn uk-btn-primary"
                  style={`background:${initialColor};border-color:${initialColor};`}
                >
                  Book Now
                </button>
                <p class="text-sm text-muted-foreground mb-0">This is how your booking widget buttons will look.</p>
              </div>
            </form>
          </section>
        </div>
      </div>

      <script>{`
        (function() {
          var colorInput = document.getElementById('widget-primary-color');
          var textInput = document.getElementById('widget-primary-color-text');
          var preview = document.getElementById('widget-primary-color-preview');
          if (!colorInput || !textInput || !preview) return;

          function applyColor(value) {
            preview.style.backgroundColor = value;
            preview.style.borderColor = value;
          }

          function normalizeHex(value) {
            if (!value) return '';
            var normalized = String(value).trim();
            if (normalized[0] !== '#') normalized = '#' + normalized;
            return normalized.slice(0, 7);
          }

          colorInput.addEventListener('input', function() {
            var value = colorInput.value;
            textInput.value = value;
            applyColor(value);
          });

          textInput.addEventListener('input', function() {
            var value = normalizeHex(textInput.value);
            textInput.value = value;
            if (/^#[0-9a-fA-F]{6}$/.test(value)) {
              colorInput.value = value;
              applyColor(value);
            }
          });

          textInput.addEventListener('change', function() {
            if (!/^#[0-9a-fA-F]{6}$/.test(textInput.value)) {
              textInput.value = colorInput.value;
            }
            applyColor(colorInput.value);
          });

          applyColor(colorInput.value);
        })();
      `}</script>
    </Layout>
  );
};
