# Recovery Inventory

Generated: 2026-04-25T09:18:42.316Z

## Targets read from targets.txt
- https://www.exoape.com/work/pixelflakes
- https://www.exoape.com/news
- https://www.exoape.com/story
- https://www.exoape.com/contact
- https://fluid.glass
- https://inversa.com
- https://aebeleinteriors.com
- https://alitwotimes.com

## Targets visited in the test run
- https://www.exoape.com/work/pixelflakes

## Assets captured by type
- html: 2
- js: 17
- json: 2

## Skipped assets by reason
- image: 20
- font: 3
- video: 8

## Source-map findings
- Source map probes: 35
- Source maps with reconstruction: 0
- Source maps missing sourcesContent: 0

## Reconstructed source findings
- Reconstructed files from sourcesContent: 0

## Failures and HTTP errors
- [static] https://www.exoape.com/work/pixelflakes :: Maximum number of redirects exceeded
- [runtime-response] https://api.storyblok.com/v2/cdn/stories/work/pixelflakes?version=published&cv=1777108683107&resolve_relations=ProjectNextProject.project&token=qDQxzVqZ6yC6Q11ONwNINQtt :: response.body: Response body is unavailable for redirect responses
- [runtime-response] https://api.storyblok.com/v2/cdn/stories/global?version=published&cv=1777108683535&token=qDQxzVqZ6yC6Q11ONwNINQtt :: response.body: Response body is unavailable for redirect responses

## Coverage gaps
- Small pass only; not all targets and not deep interaction paths.
- Analytics/media/fonts skipped by default policy.

## Recommended next pass
- Increase page/asset limits gradually and run across all targets.

## Crawl status
- Full crawl has NOT yet been run.
