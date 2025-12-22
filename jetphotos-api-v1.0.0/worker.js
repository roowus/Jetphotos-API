/**
 * JetPhotos Unofficial API Proxy (Cloudflare Worker)
 *
 * This Worker fetches aircraft photo search results from JetPhotos.com,
 * parses the HTML content using HTMLRewriter, and returns the structured
 * photo data as a clean JSON response.
 *
 * ---
 * Deployment Instructions:
 * 1. Deploy this code to a Cloudflare Worker environment.
 * 2. The Worker URL (e.g., your-worker-name.workers.dev) becomes your API endpoint.
 * ---
 */

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

/**
 * Main handler for incoming HTTP requests.
 * @param {Request} request The incoming request containing search parameters.
 * @returns {Response} A JSON response with the scraped photo data.
 */
async function handleRequest(request) {
    // Standard CORS headers allowing requests from any origin.
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Respond to CORS preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    const url = new URL(request.url);
    const params = url.searchParams;

    // Construct the Target URL for JetPhotos.com
    const jetPhotosBaseUrl = "https://www.jetphotos.com/showphotos.php";
    const jetPhotosParams = new URLSearchParams();

    // Map the Worker's URL parameters to the required JetPhotos query parameters
    jetPhotosParams.set('page', params.get('page') || '1');
    jetPhotosParams.set('sort-order', params.get('sort-order') || '0');
    jetPhotosParams.set('keywords-contain', params.get('keywords-contain') || '3'); // 3 = contains
    jetPhotosParams.set('keywords-type', params.get('keywords-type') || 'all');
    jetPhotosParams.set('keywords', params.get('keywords') || '');
    jetPhotosParams.set('aircraft', params.get('aircraft') || 'all');
    jetPhotosParams.set('airline', params.get('airline') || 'all');
    jetPhotosParams.set('country-location', params.get('country') || 'all');
    jetPhotosParams.set('photo-year', params.get('year') || 'all');
    jetPhotosParams.set('photographer-group', params.get('photographer') || 'all');
    jetPhotosParams.set('category', params.get('category') || 'all');
    jetPhotosParams.set('width', params.get('width') || '');
    jetPhotosParams.set('height', params.get('height') || '');
    jetPhotosParams.set('genre', 'all');
    jetPhotosParams.set('search-type', 'Advanced');

    const jetPhotosUrl = `${jetPhotosBaseUrl}?${jetPhotosParams.toString()}`;

    try {
        // Fetch HTML from JetPhotos
        const fetchHeaders = new Headers();
        fetchHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        fetchHeaders.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7');
        fetchHeaders.set('Referer', 'https://www.jetphotos.com/');

        const response = await fetch(jetPhotosUrl, {
            headers: fetchHeaders
        });

        if (!response.ok) {
            return new Response(JSON.stringify({
                error: `Failed to fetch source data: ${response.status} ${response.statusText}`
            }), {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        const html = await response.text();
        const photos = [];

        // HTML Parsing Logic (HTMLRewriter)
        class PhotoStreamHandler {
            constructor(photosArray) {
                this.photos = photosArray;
                this.currentPhoto = null;
                this.currentStatText = '';

                // State variables for parsing photo detail lists
                this.isInsideInfoListItem = false;
                this.currentInfoListText = '';
                this.currentLinkHref = '';
                this.currentLinkText = '';
            }

            // Handler for the main photo container (`div[data-photo]`)
            divElement(element) {
                if (element.hasAttribute('data-photo')) {
                    this.currentPhoto = {
                        photoId: element.getAttribute('data-photo'),
                        thumbnailUrl: 'N/A',
                        imageUrl: 'N/A',
                        photoPageUrl: 'N/A',
                        registration: 'N/A',
                        registrationUrl: 'N/A',
                        aircraftType: 'N/A',
                        airline: 'N/A',
                        airlineUrl: 'N/A',
                        photographer: 'N/A',
                        photographerUrl: 'N/A',
                        location: 'N/A',
                        locationUrl: 'N/A',
                        photoDate: 'N/A',
                        uploadedDate: 'N/A',
                        likes: '0',
                        comments: '0',
                        views: '0'
                    };

                    // When the photo container closes, push the complete photo object
                    element.onEndTag(() => {
                        if (this.currentPhoto) {
                            // Clean up the aircraft type string
                            this.currentPhoto.aircraftType = this.currentPhoto.aircraftType.replace(/[\\/:*?"<>|]/g, '').trim() || 'Unknown';
                            this.photos.push(this.currentPhoto);
                            this.currentPhoto = null;
                        }
                    });
                }
            }

            // Handler for the photo image tag (`img.result__photo`)
            imgElement(element) {
                if (this.currentPhoto) {
                    const src = element.getAttribute('src');
                    if (src) {
                        this.currentPhoto.thumbnailUrl = src.startsWith('//') ? `https:${src}` : src;
                        this.currentPhoto.imageUrl = this.currentPhoto.thumbnailUrl.replace('/400/', '/full/');
                    }
                    // Extract initial details from the alt text
                    const altText = element.getAttribute('alt');
                    if (altText) {
                        const parts = altText.split('-').map(p => p.trim());
                        if (parts.length >= 3) {
                            this.currentPhoto.registration = parts[0];
                            this.currentPhoto.aircraftType = parts[1];
                            this.currentPhoto.airline = parts[2];
                        }
                    }
                }
            }

            // Handler for the photo link (`a.result__photoLink`)
            photoLinkElement(element) {
                if (this.currentPhoto) {
                    const href = element.getAttribute('href');
                    if (href) {
                        this.currentPhoto.photoPageUrl = `https://www.jetphotos.com${href}`;
                    }
                }
            }

            // Handler for photo detail list items (`.result__infoListText`)
            infoListItemElement(element) {
                if (!this.currentPhoto) return;
                this.isInsideInfoListItem = true;
                this.currentInfoListText = '';
                this.currentLinkHref = '';
                this.currentLinkText = '';

                element.onEndTag(() => {
                    if (!this.currentPhoto) return;
                    this.isInsideInfoListItem = false;

                    const fullText = this.currentInfoListText.trim();
                    let valueToUse = this.currentLinkText ? this.currentLinkText.trim() : fullText;

                    // Clean up text if no link was present (e.g., stripping "Reg:" or "Photo date:")
                    if (!this.currentLinkText) {
                         if (fullText.includes('Reg:')) {
                             valueToUse = fullText.replace('Reg:', '').trim().split(' ')[0];
                         } else if (fullText.includes('Aircraft:')) {
                             valueToUse = fullText.replace('Aircraft:', '').trim();
                         } else if (fullText.includes('Airline:')) {
                             valueToUse = fullText.replace('Airline:', '').trim();
                         } else if (fullText.includes('Location:')) {
                             valueToUse = fullText.replace('Location:', '').trim();
                         } else if (fullText.includes('Photo date:')) {
                             valueToUse = fullText.replace('Photo date:', '').trim();
                         } else if (fullText.includes('Uploaded:')) {
                             valueToUse = fullText.replace('Uploaded:', '').trim();
                         } else if (fullText.includes('By:') || fullText.includes('Photographer:')) {
                             valueToUse = fullText.replace('By:', '').replace('Photographer:', '').trim();
                         }
                    }

                    // Assign the extracted value and link to the current photo object
                    if (fullText.includes('Reg:')) {
                        this.currentPhoto.registration = valueToUse;
                        this.currentPhoto.registrationUrl = this.currentLinkHref ? `https://www.jetphotos.com${this.currentLinkHref}` : 'N/A';
                    } else if (fullText.includes('Aircraft:')) {
                        this.currentPhoto.aircraftType = valueToUse;
                    } else if (fullText.includes('Airline:')) {
                        this.currentPhoto.airline = valueToUse;
                        this.currentPhoto.airlineUrl = this.currentLinkHref ? `https://www.jetphotos.com${this.currentLinkHref}` : 'N/A';
                    } else if (fullText.includes('Location:')) {
                        this.currentPhoto.location = valueToUse;
                        this.currentPhoto.locationUrl = this.currentLinkHref ? `https://www.jetphotos.com${this.currentLinkHref}` : 'N/A';
                    } else if (fullText.includes('Photo date:')) {
                        this.currentPhoto.photoDate = valueToUse;
                    } else if (fullText.includes('Uploaded:')) {
                        this.currentPhoto.uploadedDate = valueToUse;
                    } else if (fullText.includes('By:') || fullText.includes('Photographer:')) {
                        this.currentPhoto.photographer = valueToUse;
                        this.currentPhoto.photographerUrl = this.currentLinkHref ? `https://www.jetphotos.com${this.currentLinkHref}` : 'N/A';
                    }
                });
            }

            // Accumulates all text inside a photo detail list item
            infoListTextAccumulator(textChunk) {
                if (this.isInsideInfoListItem) {
                    this.currentInfoListText += textChunk.text;
                }
            }

            // Handler for any link (`<a>` tag) found inside the detail list item
            linkInInfoTextElement(element) {
                if (this.currentPhoto && this.isInsideInfoListItem) {
                    this.currentLinkHref = element.getAttribute('href');
                    this.currentLinkText = ''; // Reset for this link's text
                }
            }

            // Accumulates text specifically within the link tag
            linkTextInInfoTextAccumulator(textChunk) {
                if (this.currentPhoto && this.isInsideInfoListItem && this.currentLinkHref) {
                    this.currentLinkText += textChunk.text;
                }
            }

            // Handler for the statistics elements (`.result__stat`)
            statElement(element) {
                if (this.currentPhoto) {
                    this.currentStatText = '';
                    element.onEndTag(() => {
                        const text = this.currentStatText;
                        const valueMatch = text.match(/\d+/);
                        const value = valueMatch ? valueMatch[0] : '0';

                        if (text.includes('Likes:')) {
                            this.currentPhoto.likes = value;
                        } else if (text.includes('Comments:')) {
                            this.currentPhoto.comments = value;
                        } else if (text.includes('Views:')) {
                            this.currentPhoto.views = value;
                        }
                    });
                }
            }

            // Accumulates text inside the stats element
            statTextAccumulator(textChunk) {
                if (this.currentPhoto) {
                    this.currentStatText += textChunk.text;
                }
            }
        }

        const handler = new PhotoStreamHandler(photos);

        // Define which HTML elements and their contents should be processed
        await new HTMLRewriter()
            .on('div[data-photo]', { element: handler.divElement.bind(handler) })
            .on('img.result__photo', { element: handler.imgElement.bind(handler) })
            .on('a.result__photoLink', { element: handler.photoLinkElement.bind(handler) })
            .on('.result__infoListText', {
                element: handler.infoListItemElement.bind(handler),
                text: handler.infoListTextAccumulator.bind(handler)
            })
            .on('.result__infoListText a', {
                element: handler.linkInInfoTextElement.bind(handler),
                text: handler.linkTextInInfoTextAccumulator.bind(handler)
            })
            .on('.result__stat', {
                element: handler.statElement.bind(handler),
                text: handler.statTextAccumulator.bind(handler)
            })
            .transform(new Response(html))
            .text();

        // Return Final JSON Response
        return new Response(JSON.stringify({
            photos: photos,
            count: photos.length
        }), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });

    } catch (error) {
        console.error('Worker processing error:', error);
        return new Response(JSON.stringify({
            error: 'Internal API Proxy Error',
            details: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}
