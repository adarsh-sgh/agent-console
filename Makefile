PY ?= python3
VENV = agent/.venv

.PHONY: setup dev agent gateway web mobile test test-agent test-gateway test-web test-mobile build bundle-mobile

setup: ## install everything (python venv + npm)
	$(PY) -m venv $(VENV) && $(VENV)/bin/pip install -q -r agent/requirements.txt
	cd shared && npm install --silent
	cd middleware && npm install --silent
	cd web && npm install --silent
	cd mobile && npm install --silent

dev: ## run agent (:8000), gateway (:4000) and web (:5173) together
	@trap 'kill 0' INT TERM; \
	$(MAKE) agent & $(MAKE) gateway & $(MAKE) web & wait

agent:
	cd agent && INTERNAL_TOKEN=$${INTERNAL_TOKEN:-dev-token} .venv/bin/uvicorn agent_console.server:app --port 8000 --reload

gateway:
	cd middleware && AGENT_URL=$${AGENT_URL:-http://localhost:8000} INTERNAL_TOKEN=$${INTERNAL_TOKEN:-dev-token} npm run dev

web:
	cd web && npm run dev

mobile: ## Expo dev server; point the app at the gateway over the LAN, not localhost
	cd mobile && EXPO_PUBLIC_GATEWAY_URL=$${EXPO_PUBLIC_GATEWAY_URL:-http://localhost:4000} npx expo start

test: test-agent test-gateway test-web test-mobile

test-agent:
	cd agent && .venv/bin/python -m pytest -q

test-gateway:
	cd middleware && npx tsc --noEmit && npm test --silent

test-web:
	cd web && npx tsc --noEmit && npm test --silent

test-mobile:
	cd mobile && npx tsc --noEmit && npm test --silent

build:
	cd web && npm run build

bundle-mobile: ## Metro bundle check; no simulator needed
	cd mobile && npx expo export --platform ios
