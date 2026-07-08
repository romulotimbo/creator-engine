import { Config } from "@remotion/cli/config"

// Config só afeta a CLI/Studio (dev). O render de produção usa a API programática
// do @remotion/renderer no worker (src/worker/index.ts).
Config.setVideoImageFormat("jpeg")
Config.setConcurrency(1)
Config.setChromiumOpenGlRenderer("angle")
