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
