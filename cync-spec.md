# cync - 설계 스펙 & 구현 가이드

> Claude Code 설정을 클라우드(GitHub)에 백업/동기화하는 오픈소스 플러그인

---

## 이 문서의 용도

이 문서는 `cync` 플러그인을 구현하기 위한 완전한 설계 스펙이다.
새로운 Claude Code 세션에서 이 문서를 참조하여 구현을 시작할 수 있다.

### 구현 시작 방법

```
1. 이 파일을 읽는다
2. 기존 Claude Code 플러그인 구조를 참조한다:
   - ~/.claude/plugins/cache/claude-plugins-official/ralph-loop/  (간단한 플러그인 예시)
   - ~/.claude/plugins/cache/claude-plugins-official/superpowers/ (복잡한 플러그인 예시)
3. Phase별로 순서대로 구현한다
```

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | `cync` |
| **형태** | Claude Code 플러그인 (오픈소스) |
| **저장소** | GitHub Private Repo (기본, 향후 플러거블 백엔드) |
| **동기화 방식** | Git CLI 기반 수동 push/pull (MVP) |
| **기술 스택** | TypeScript + Node.js |
| **테스트** | Vitest |
| **라이선스** | MIT |
| **대상 사용자** | Claude Code를 사용하는 개발자 (git 사용 가능 전제) |

### 해결하려는 문제

Claude Code 사용자들이 여러 머신에서 동일한 설정(CLAUDE.md, 커스텀 스킬, 커맨드, settings.json 등)을 사용하고 싶지만, 현재는 로컬 tarball 백업만 존재하고 클라우드 동기화 메커니즘이 없다.

### 핵심 기능

1. `/sync-init` - GitHub repo 연결 및 초기 설정
2. `/sync-push` - 로컬 설정을 원격으로 백업
3. `/sync-pull` - 원격 설정을 로컬로 복원
4. `/sync-status` - 동기화 상태 확인
5. 모듈별 선택적 동기화 (core, skills, commands, memory, plugins, plans, full)
6. 민감 정보 스캔 및 선택적 암호화

---

## 2. Claude Code 플러그인 시스템 참고

### 플러그인 구조 규칙

Claude Code 플러그인은 다음 구조를 따른다:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # 필수. 플러그인 메타데이터
├── commands/
│   └── command-name.md      # 슬래시 커맨드 정의
├── scripts/
│   └── script.sh            # 커맨드에서 호출하는 실행 스크립트
├── hooks/
│   └── hooks.json           # 라이프사이클 훅 (선택)
└── skills/
    └── skill-name/
        └── SKILL.md          # 스킬 정의 (선택)
```

### plugin.json 형식

```json
{
  "name": "cync",
  "description": "Backup and sync your Claude Code settings to the cloud via Git",
  "version": "1.0.0",
  "author": {
    "name": "작성자명"
  },
  "license": "MIT",
  "keywords": ["sync", "backup", "settings", "dotfiles"]
}
```

### 커맨드 파일 형식 (commands/*.md)

```yaml
---
description: "커맨드 설명 (도움말에 표시)"
argument-hint: "[--flag value]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/script.sh:*)"]
---

# 커맨드 설명

인라인 실행:
```!
"${CLAUDE_PLUGIN_ROOT}/scripts/script.sh" $ARGUMENTS
```
```

**핵심 변수:**
- `${CLAUDE_PLUGIN_ROOT}` - 플러그인 설치 디렉토리 경로
- `$ARGUMENTS` - 사용자가 전달한 인자

### 참고할 기존 플러그인

1. **ralph-loop** (`~/.claude/plugins/cache/claude-plugins-official/ralph-loop/`)
   - 간단한 구조: commands + scripts + hooks
   - Shell 스크립트로 로직 실행

2. **superpowers** (`~/.claude/plugins/cache/claude-plugins-official/superpowers/`)
   - 복잡한 구조: skills 14개 + commands + hooks + agents
   - SessionStart hook 사용 예시

---

## 3. 프로젝트 구조

```
cync/
├── .claude-plugin/
│   └── plugin.json              # 플러그인 메타데이터
├── commands/
│   ├── sync-init.md             # /sync-init 슬래시 커맨드
│   ├── sync-push.md             # /sync-push 슬래시 커맨드
│   ├── sync-pull.md             # /sync-pull 슬래시 커맨드
│   ├── sync-status.md           # /sync-status 슬래시 커맨드
│   └── sync-help.md             # /sync-help 슬래시 커맨드
├── scripts/
│   ├── sync-init.sh             # 초기화 스크립트
│   ├── sync-push.sh             # push 실행 스크립트
│   ├── sync-pull.sh             # pull 실행 스크립트
│   └── sync-status.sh           # 상태 확인 스크립트
├── src/                         # TypeScript 소스 코드
│   ├── cli.ts                   # CLI 엔트리포인트 (commander.js)
│   ├── sync-engine.ts           # 핵심 동기화 엔진
│   ├── config.ts                # .cc-sync.yml 파싱/검증
│   ├── modules/
│   │   ├── index.ts             # 모듈 레지스트리
│   │   ├── base-module.ts       # 모듈 기본 인터페이스
│   │   ├── core-settings.ts     # CLAUDE.md, settings.json 등
│   │   ├── skills.ts            # ~/.claude/skills/
│   │   ├── commands.ts          # ~/.claude/commands/
│   │   ├── memory.ts            # projects/*/memory/
│   │   ├── plugins.ts           # 플러그인 설치 목록
│   │   ├── plans.ts             # plans/
│   │   └── full-backup.ts       # 전체 백업
│   └── utils/
│       ├── git.ts               # git 명령어 래퍼
│       ├── file-mapper.ts       # 소스↔sync repo 경로 매핑
│       ├── crypto.ts            # AES-256-GCM 암호화 (선택적)
│       ├── sensitive-scanner.ts # 민감 정보 탐지
│       └── logger.ts            # 출력 포맷팅
├── tests/
│   ├── unit/
│   │   ├── config.test.ts
│   │   ├── file-mapper.test.ts
│   │   ├── modules/
│   │   │   ├── core-settings.test.ts
│   │   │   ├── skills.test.ts
│   │   │   └── commands.test.ts
│   │   └── git.test.ts
│   ├── integration/
│   │   ├── sync-push.test.ts
│   │   ├── sync-pull.test.ts
│   │   └── conflict.test.ts
│   └── fixtures/
│       └── mock-claude-dir/     # 테스트용 .claude 모의 구조
├── dist/                        # 빌드 결과물 (git에 포함)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── LICENSE
└── README.md
```

### 실행 흐름

```
사용자: /sync-push --module core --dry-run
  │
  ├─ commands/sync-push.md
  │   └─ scripts/sync-push.sh $ARGUMENTS
  │
  ├─ sync-push.sh
  │   └─ node "${PLUGIN_ROOT}/dist/cli.js" push $@
  │
  ├─ cli.ts (commander.js)
  │   └─ push 서브커맨드 파싱
  │       ├─ --module core
  │       └─ --dry-run
  │
  ├─ sync-engine.ts: push()
  │   ├─ config.ts: loadConfig() → .cc-sync.yml 로드
  │   ├─ modules/core-settings.ts: getFiles()
  │   ├─ file-mapper.ts: 소스 → sync repo 경로 매핑
  │   ├─ (dry-run이면 여기서 diff만 출력하고 종료)
  │   ├─ 파일 복사: ~/.claude/ → ~/.claude/.cc-sync-repo/
  │   └─ git.ts: add → commit → push
  │
  └─ 결과 출력 (logger.ts)
```

---

## 4. 설정 파일 (.cc-sync.yml)

사용자가 `~/.claude/.cc-sync.yml`에 생성하여 동기화 대상과 옵션을 관리한다.

```yaml
# ~/.claude/.cc-sync.yml
# /sync-init 으로 자동 생성되거나 수동 편집 가능

# Git 원격 저장소 URL
remote: git@github.com:username/claude-code-settings.git
branch: main

# 동기화 모듈 선택 (기본: core, skills, commands만 활성)
modules:
  core: true          # CLAUDE.md, 프레임워크 문서들, settings.json
  skills: true        # ~/.claude/skills/ 디렉토리
  commands: true      # ~/.claude/commands/ 디렉토리
  memory: false       # projects/*/memory/ (프로젝트별 메모리)
  plugins: false      # 플러그인 설치 목록 (manifest만)
  plans: false        # plans/ 디렉토리
  full: false         # 전체 백업 (제외 패턴 적용)

# 민감 파일 처리 설정
sensitive:
  encrypt: false      # true면 settings.json 등을 AES-256-GCM으로 암호화
  exclude:            # 항상 동기화에서 제외되는 패턴
    - "*.jsonl"           # 세션 히스토리 (대용량)
    - "debug/"            # 디버그 스냅샷
    - "telemetry/"        # 텔레메트리 데이터
    - "shell-snapshots/"  # 셸 스냅샷
    - "file-history/"     # 파일 수정 이력
    - "*.lock"            # 락 파일
    - "*.highwatermark"
    - "paste-cache/"
    - "sessions/"
    - "statsig/"
    - "chrome/"
    - "ide/"
    - "cache/"
    - "todos/"
    - "backups/"

# 머신 식별자 (자동 생성, 향후 양방향 동기화용)
machine_id: ""
```

---

## 5. 동기화 모듈 상세

### 모듈 매핑 테이블

| 모듈 | 소스 경로 (~/.claude/) | Sync Repo 경로 | 기본 활성 | 설명 |
|------|------------------------|----------------|-----------|------|
| `core` | `CLAUDE.md`, `COMMANDS.md`, `FLAGS.md`, `PRINCIPLES.md`, `RULES.md`, `MCP.md`, `PERSONAS.md`, `ORCHESTRATOR.md`, `MODES.md`, `settings.json`, `settings.local.json`, `.superclaude-metadata.json` | `core/` | ✅ | 프레임워크 문서 + 설정 |
| `skills` | `skills/**` | `skills/` | ✅ | 커스텀 스킬 전체 |
| `commands` | `commands/**` | `commands/` | ✅ | 커스텀 커맨드 전체 |
| `memory` | `projects/*/memory/**`, `projects/*/MEMORY.md` | `memory/{project-name}/` | ❌ | 프로젝트별 메모리 |
| `plugins` | `plugins/installed_plugins.json` | `plugins/manifest.json` | ❌ | 설치 목록만 (복원용) |
| `plans` | `plans/*.md` | `plans/` | ❌ | 실행 계획 파일 |
| `full` | 전체 (sensitive.exclude 적용) | `full/` | ❌ | 전체 백업 |

### 모듈 인터페이스

```typescript
// src/modules/base-module.ts
interface SyncModule {
  name: string;
  description: string;

  // 동기화 대상 파일 목록 반환
  getFiles(claudeDir: string): Promise<FileMapping[]>;

  // 로컬 → sync repo로 파일 복사
  copyToSyncRepo(claudeDir: string, syncRepoDir: string): Promise<CopyResult>;

  // sync repo → 로컬로 파일 복사
  copyFromSyncRepo(syncRepoDir: string, claudeDir: string): Promise<CopyResult>;
}

interface FileMapping {
  sourcePath: string;      // 절대 경로 (예: ~/.claude/CLAUDE.md)
  syncRepoPath: string;    // sync repo 내 상대 경로 (예: core/CLAUDE.md)
}

interface CopyResult {
  copied: string[];        // 복사된 파일 목록
  skipped: string[];       // 건너뛴 파일 목록
  errors: string[];        // 에러 목록
}
```

### Sync Repo 구조 (GitHub에 저장되는 형태)

```
claude-code-settings/        # GitHub private repo
├── .cc-sync-meta.json       # 메타데이터 (마지막 sync 시간, 머신, 모듈 버전)
├── .gitignore
├── core/
│   ├── CLAUDE.md
│   ├── COMMANDS.md
│   ├── FLAGS.md
│   ├── PRINCIPLES.md
│   ├── RULES.md
│   ├── MCP.md
│   ├── PERSONAS.md
│   ├── ORCHESTRATOR.md
│   ├── MODES.md
│   ├── settings.json
│   └── settings.local.json
├── skills/
│   ├── sdd-from-prd/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── sdd-ready-prd/
│   └── cross-service-spec-generator/
├── commands/
│   ├── sc/
│   │   ├── analyze.md
│   │   ├── build.md
│   │   └── ...
│   ├── analyze-module.md
│   ├── implement-feature.md
│   └── modify-feature.md
├── memory/                   # (memory 모듈 활성 시)
│   └── {project-name}/
│       ├── MEMORY.md
│       └── *.md
└── plugins/                  # (plugins 모듈 활성 시)
    └── manifest.json
```

---

## 6. 커맨드 인터페이스 상세

### /sync-init

**목적**: GitHub repo 연결 및 `.cc-sync.yml` 초기 생성

```
사용법: /sync-init <remote-url>
예시:  /sync-init git@github.com:user/claude-settings.git

실행 흐름:
1. git이 설치되어 있는지 확인
2. remote-url 유효성 검증
3. ~/.claude/.cc-sync-repo/ 에 git clone (기존 repo) 또는 git init + remote add (새 repo)
4. 대화형으로 활성 모듈 선택 (기본: core, skills, commands)
5. ~/.claude/.cc-sync.yml 생성
6. machine_id 자동 생성 (hostname 기반)
7. sync repo에 .gitignore 생성
8. 초기 push 여부 확인
```

### /sync-push

**목적**: 로컬 설정을 원격 repo로 백업

```
사용법: /sync-push [옵션]
옵션:
  --module <names>    특정 모듈만 push (쉼표 구분: core,skills)
  --message <msg>     커밋 메시지 지정 (기본: 자동 생성)
  --dry-run           변경사항 미리보기만 (실제 push 안함)
  --force             충돌 무시하고 강제 push

실행 흐름:
1. .cc-sync.yml 로드 → 활성 모듈 확인
2. --module 지정 시 해당 모듈만, 미지정 시 활성 모듈 전체
3. sensitive-scanner로 민감 정보 스캔 → 감지 시 경고
4. 각 모듈의 getFiles() → 파일 수집
5. file-mapper로 경로 매핑
6. --dry-run이면 변경 파일 목록만 출력하고 종료
7. 파일 복사: ~/.claude/ → ~/.claude/.cc-sync-repo/
8. .cc-sync-meta.json 업데이트 (시간, 머신, 모듈)
9. git add → commit → push
10. 결과 리포트: 동기화된 파일 수, 크기, 소요 시간

커밋 메시지 자동 생성 형식:
  "sync: {모듈명} from {machine_id} at {timestamp}"
  예: "sync: core,skills from macbook-pro at 2026-03-15T10:30:00"
```

### /sync-pull

**목적**: 원격 설정을 로컬로 복원

```
사용법: /sync-pull [옵션]
옵션:
  --module <names>    특정 모듈만 pull
  --dry-run           변경될 파일 목록만 출력
  --backup            pull 전 현재 상태 백업
  --keep-local        충돌 시 로컬 파일 유지

실행 흐름:
1. git pull (sync repo)
2. --backup 시: 현재 설정을 ~/.claude/backups/pre-sync-{timestamp}.tar.gz 로 백업
3. 모듈별 파일 비교 (sync repo vs 로컬)
4. --dry-run이면 변경 파일 목록만 출력하고 종료
5. 충돌 감지:
   a. 로컬에 수정된 파일이 원격과 다르면
   b. 기본: 원격 우선 (로컬은 {파일명}.local-backup 으로 보존)
   c. --keep-local: 로컬 우선 (원격 무시)
6. sync repo → ~/.claude/ 로 파일 복사
7. 결과 리포트
```

### /sync-status

**목적**: 현재 동기화 상태 확인

```
사용법: /sync-status

출력:
  ╔══════════════════════════════════════╗
  ║       Claude Code Sync Status       ║
  ╠══════════════════════════════════════╣
  ║ Remote: github.com:user/settings    ║
  ║ Branch: main                        ║
  ║ Machine: macbook-pro                ║
  ║ Last Push: 2026-03-15 10:30         ║
  ║ Last Pull: 2026-03-14 18:00         ║
  ╠══════════════════════════════════════╣
  ║ Module     │ Status    │ Changes    ║
  ║ core       │ ✅ synced │ 0 files    ║
  ║ skills     │ ⚠ modified│ 2 files    ║
  ║ commands   │ ✅ synced │ 0 files    ║
  ║ memory     │ ⏸ disabled│ -          ║
  ║ plugins    │ ⏸ disabled│ -          ║
  ╚══════════════════════════════════════╝
```

### /sync-help

**목적**: 사용법 안내

---

## 7. 에러 처리

| 상황 | 에러 코드 | 대응 |
|------|-----------|------|
| git 미설치 | `GIT_NOT_FOUND` | "git이 필요합니다. https://git-scm.com 에서 설치하세요." |
| remote 접근 불가 | `REMOTE_UNREACHABLE` | SSH key 확인 또는 HTTPS 토큰 설정 안내 |
| .cc-sync.yml 없음 | `CONFIG_NOT_FOUND` | "/sync-init으로 초기 설정을 먼저 해주세요." |
| sync repo 없음 | `REPO_NOT_FOUND` | "/sync-init으로 repo를 연결해주세요." |
| push 중 원격 변경 감지 | `REMOTE_CHANGED` | "/sync-pull을 먼저 실행해주세요." |
| 대용량 파일 (>10MB) | `LARGE_FILE_WARNING` | 경고 표시 + 계속 진행 여부 확인 |
| 디스크 공간 부족 | `DISK_FULL` | 에러 + ~/.claude/backups/ 정리 안내 |
| 민감 정보 감지 | `SENSITIVE_DATA_FOUND` | 감지된 패턴 표시 + 제외 또는 암호화 권장 |
| 암호화 키 분실 | `ENCRYPTION_KEY_LOST` | 복구 불가 경고 (setup 시 미리 안내) |

---

## 8. 보안

### 기본 제외 대상
세션 히스토리(*.jsonl), 텔레메트리, 디버그 데이터, 락 파일 등은 항상 제외.

### 민감 패턴 스캔 (sensitive-scanner.ts)
push 전 다음 패턴을 스캔하여 경고:

```typescript
const SENSITIVE_PATTERNS = [
  /api[_-]?key\s*[:=]\s*["'][^"']+/i,
  /token\s*[:=]\s*["'][^"']+/i,
  /password\s*[:=]\s*["'][^"']+/i,
  /secret\s*[:=]\s*["'][^"']+/i,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
  /sk-[a-zA-Z0-9]{20,}/,           // OpenAI/Anthropic API key 패턴
  /ghp_[a-zA-Z0-9]{36}/,           // GitHub personal access token
  /aws_access_key_id\s*[:=]/i,
];
```

### 선택적 암호화 (crypto.ts)
`sensitive.encrypt: true` 설정 시:
- AES-256-GCM으로 settings.json 등 암호화
- 암호화 키는 사용자가 환경변수(`CC_SYNC_KEY`)로 제공
- 또는 첫 init 시 키 생성 → 안전한 위치에 저장 안내

### Private Repo 권장
init 시 public repo이면 경고 메시지 표시.

---

## 9. 구현 계획 (Phase별)

### Phase 1: 프로젝트 초기 설정
**예상 파일**: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `LICENSE`

```bash
# 프로젝트 디렉토리에서
npm init -y
npm install typescript commander js-yaml glob chalk
npm install -D vitest @types/node @types/js-yaml
```

**tsconfig.json 핵심 설정**:
- `target`: ES2022
- `module`: Node16
- `moduleResolution`: Node16
- `strict`: true
- `outDir`: ./dist

**package.json scripts**:
```json
{
  "build": "tsc",
  "test": "vitest run",
  "test:watch": "vitest",
  "prepublishOnly": "npm run build"
}
```

### Phase 2: 핵심 유틸리티 구현
**파일**: `src/utils/git.ts`, `src/utils/file-mapper.ts`, `src/utils/logger.ts`, `src/config.ts`

1. **git.ts**: `execSync` 래퍼. clone, pull, push, status, add, commit, diff 함수
2. **file-mapper.ts**: `FileMapping` 타입. 소스 경로 ↔ sync repo 경로 변환
3. **logger.ts**: 색상 출력, 테이블 포맷, 진행 표시
4. **config.ts**: YAML 파싱, 스키마 검증, 기본값 병합

### Phase 3: 동기화 모듈 구현
**파일**: `src/modules/*.ts`

각 모듈은 `SyncModule` 인터페이스를 구현:
1. `base-module.ts` - 공통 파일 복사 로직, 유틸 함수
2. `core-settings.ts` - 루트 MD 파일 + settings.json 매핑
3. `skills.ts` - skills/ 디렉토리 재귀 복사
4. `commands.ts` - commands/ 디렉토리 재귀 복사
5. `memory.ts` - projects/*/memory/ → memory/{project-name}/ 매핑
6. `plugins.ts` - installed_plugins.json → manifest.json 변환
7. `plans.ts` - plans/*.md 복사
8. `full-backup.ts` - 전체 복사 (exclude 패턴 적용)
9. `index.ts` - 모듈 레지스트리 (이름으로 모듈 조회)

### Phase 4: 동기화 엔진 & CLI 구현
**파일**: `src/sync-engine.ts`, `src/cli.ts`

**sync-engine.ts** 핵심 메서드:
```typescript
class SyncEngine {
  async init(remoteUrl: string, options?: InitOptions): Promise<void>;
  async push(options?: PushOptions): Promise<PushResult>;
  async pull(options?: PullOptions): Promise<PullResult>;
  async status(): Promise<StatusResult>;
}
```

**cli.ts**: commander.js로 서브커맨드 정의
```typescript
program
  .command('init <remote-url>')
  .command('push')
  .command('pull')
  .command('status')
```

### Phase 5: 보안 유틸리티 구현
**파일**: `src/utils/sensitive-scanner.ts`, `src/utils/crypto.ts`

1. **sensitive-scanner.ts**: 파일 내용 스캔, 정규식 패턴 매칭, 결과 리포트
2. **crypto.ts**: AES-256-GCM 암호화/복호화, 키 관리

### Phase 6: Claude Code 플러그인 통합
**파일**: `.claude-plugin/plugin.json`, `commands/*.md`, `scripts/*.sh`

1. plugin.json 작성
2. 5개 슬래시 커맨드 정의 (sync-init, sync-push, sync-pull, sync-status, sync-help)
3. Shell 스크립트 작성 (커맨드 → `node dist/cli.js` 브릿지)
4. dist/ 디렉토리를 git에 포함 (플러그인 설치 시 빌드 불필요하도록)

**Shell 스크립트 예시 (scripts/sync-push.sh)**:
```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
node "${PLUGIN_ROOT}/dist/cli.js" push "$@"
```

### Phase 7: 테스트 작성
**파일**: `tests/**/*.test.ts`

1. **단위 테스트**: config 파싱, file-mapper 매핑, 각 모듈 파일 수집, git 래퍼 (mock)
2. **통합 테스트**: 임시 git repo 생성 → push/pull 워크플로우 → 정리
3. **fixtures**: mock-claude-dir/ 에 테스트용 가짜 .claude 디렉토리 구조

### Phase 8: 문서화 & 배포 준비
**파일**: `README.md`

1. README: 프로젝트 소개, 설치 방법, 사용법, 설정 가이드, 보안 안내
2. GitHub Actions CI (선택): PR 시 테스트 자동 실행
3. npm 배포 또는 GitHub marketplace 등록 (선택)

### Phase 9: Polish
최종 코드 품질 점검:
- 미사용 코드 제거
- 에러 메시지 일관성 확인
- edge case 테스트 보강
- README 최종 검토

---

## 10. 의존성 목록

### 런타임
| 패키지 | 용도 |
|--------|------|
| `commander` | CLI 인자 파싱 |
| `js-yaml` | .cc-sync.yml 파싱 |
| `glob` | 파일 패턴 매칭 |
| `chalk` | 컬러 터미널 출력 |

### 개발
| 패키지 | 용도 |
|--------|------|
| `typescript` | TypeScript 컴파일 |
| `vitest` | 테스트 프레임워크 |
| `@types/node` | Node.js 타입 |
| `@types/js-yaml` | js-yaml 타입 |

---

## 11. 향후 확장 로드맵 (v2+)

1. **자동 동기화**: SessionStart hook으로 자동 pull, 세션 종료 시 auto-push
2. **양방향 동기화**: machine_id 기반 3-way merge, 충돌 해결 UI
3. **Storage Adapter 패턴**: S3, Google Drive, Dropbox 백엔드 추가
4. **변경사항 diff UI**: 변경사항을 보기 좋게 시각화
5. **선택적 프로젝트 메모리 동기화**: 특정 프로젝트만 선택
6. **프로필 시스템**: work/home 등 상황별 설정 프로필 전환
7. **npm 패키지 배포**: `npx cync` 로 독립 CLI 사용 가능

---

## 12. 검증 체크리스트

- [ ] `npm test` → 모든 단위/통합 테스트 통과
- [ ] `/sync-init` → .cc-sync.yml 생성, sync repo 클론 성공
- [ ] `/sync-push` → GitHub repo에 설정 파일 push 확인
- [ ] `/sync-push --dry-run` → 변경 파일 목록만 출력, 실제 push 안됨
- [ ] `/sync-pull --dry-run` → 복원될 파일 목록 표시
- [ ] `/sync-pull --backup` → 백업 생성 후 복원
- [ ] `/sync-status` → 동기화 상태 정확히 표시
- [ ] 민감 패턴 스캔 → API key 포함 파일 감지
- [ ] git 미설치 환경 → 적절한 에러 메시지
- [ ] 잘못된 remote URL → 적절한 에러 메시지
- [ ] 대용량 파일 → 경고 표시
