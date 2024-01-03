# Hydra Storage

Hydra Storage는 소규모 사업이나 팀 단위 공유 스토리지 구축에 최적화된 스토리지 솔루션입니다.

Hydra Storage은 ZFS를 기반으로 백엔드 Storage Pool 구성을 지원하며, 이를 기반으로 SMB, NFS, S3 서비스를 제공할 수 있습니다. 특히 대용량 스토리지 솔루션인 KSAN(<https://github.com/infinistor/ksan>)의 Cloud Edge 형태로 스토리지 설정을 지원하여 대규모 프로젝트의 프론트엔드 스토리지로 활용할 수 있습니다.


## 주요 기능

* ZFS 기반 Local Backend Storage Pool 및 Dataset 관리
* SMB/CIFS 서비스 관리 및 제공
* NFS 서비스 관리 및 제공
* 독립적인 S3-Compatible 서비스 관리 및 제공
* KSAN 시스템과 연동하여 Cloud Edge형 S3-Compatible 서비스 관리 및 제공
* ksanLifecycleManager와 연동한 Storage ILM 지원


## 관련 링크
* KSAN Project
  * <https://github.com/infinistor/ksan>
* Hydra 웹 관리자 매뉴얼
  * <http://vpn.pspace.com:3000/share/5c107c7c-5c1e-4955-b4d9-7a932bad100d>

## Build

### Portal

#### 필수 패키지 설치
* [node.js](https://nodejs.org/)
* webpack
  ```
  npm install --save-dev webpack-cli
  ```
* [webix](https://webix.com/)

#### Build Package
```
webpack
# 빌드시 생성되는 파일 목록
# codebase/myapp.css
# codebase/myapp.js
```

### Backend

#### 필수 패키지 설치
* [GO](https://go.dev/doc/install)
* swag
  ```
  go install github.com/swaggo/swag/cmd/swag@latest
  ```

#### Build Package
```
SET GOOS=linux
SET GOARCH=amd64
swag init -g server.go
del .\linux\server
go build -o ./linux/server -buildvcs=false

# 빌드시 생성되는 파일 목록
# docs/swagger.json
# docs/swagger.yaml
# linux/server
```

## 설치방법

1. Portal Build
1. /usr/local/pspace/hydra/Backend/codebase에 webix.js, webix.css, myapp.css, myapp.js 복사
2. /usr/local/pspace/hydra/Backend에 index.html 복사
1. Backend Build
1. .env 파일 생성
	``` json
	ACCESS_SECRET= [JSON Web Token Access Secret Key]
	REFRESH_SECRET= [JSON Web Token Refresh Secret Key]
	ENCRYPT_KEY= [Encrypt Key]
	ENCRYPT_IV= [Encrypt IV]
	```
1. config.yml 파일 생성
	```
	# app port
	APP:
		part: 3030
	# db info
	db:
		host: localhost
		user: root
		password: qwe123
		database: hydra
	```
1. /usr/local/pspace/hydra/Backend에 swagger.json, swagger.yaml, server, .env, config.yml 파일 복사
1. server 시작
   ```
   ./server
   ```
1. 접속 => http://localhost:3030