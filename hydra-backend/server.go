/*
* Copyright (c) 2021 PSPACE, inc. KSAN Development Team ksan@pspace.co.kr
* KSAN is a suite of free software: you can redistribute it and/or modify it under the terms of
* the GNU General Public License as published by the Free Software Foundation, either version
* 3 of the License.  See LICENSE for details
*
* 본 프로그램 및 관련 소스코드, 문서 등 모든 자료는 있는 그대로 제공이 됩니다.
* KSAN 프로젝트의 개발자 및 개발사는 이 프로그램을 사용한 결과에 따른 어떠한 책임도 지지 않습니다.
* KSAN 개발팀은 사전 공지, 허락, 동의 없이 KSAN 개발에 관련된 모든 결과물에 대한 LICENSE 방식을 변경 할 권리가 있습니다.
 */
package main

import (
	"flag"
	"fmt"
	"log/syslog"
	"net/http"
	"os"
	"runtime"
	"strings"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-co-op/gocron"
	"github.com/jinzhu/configor"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
	"github.com/unrolled/render"
	"gopkg.in/natefinch/lumberjack.v2"
	"gopkg.in/pygz/subprocess.v1"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/go-chi/cors"

	_ "github.com/go-sql-driver/mysql"

	httpSwagger "github.com/swaggo/http-swagger"

	_ "server/docs"
)

var format = render.New()

// var drive wfs.Drive

// swagger:model
type Response struct {
	// invalid request
	Invalid bool `json:"invalid"`
	// error message
	Error string `json:"error"`
	// id
	ID string `json:"id"`
}

var conn *sqlx.DB
var connSys *sqlx.DB
var db *gorm.DB

var LogProcessName = "hydra-api-portal"

type AppConfig struct {
	Port         string
	Root         string
	ResetOnStart bool
	UploadLimit  int64

	DB DBConfig
}

type DBConfig struct {
	Host     string `default:"localhost"`
	User     string `default:"root"`
	Password string `default:"qwe123"`
	Database string `default:"hydra"`
}

// swagger:model
type Hostname struct {
	// new hostname
	Hostname string `json:"hostname" example:"user1"`
}

// swagger:model
type User struct {
	// user id
	ID int `json:"id" example:"1"`
	// username
	Username string `json:"username" example:"username"`
	// password
	Password string `json:"password" example:"password"`
}

type TokenDetails struct {
	UserID       int    `json:"user_id"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	AccessUuid   string `json:"access_uuid"`
	RefreshUuid  string `json:"refresh_uuid"`
	AtExpires    int64  `json:"at_expires"`
	RtExpires    int64  `json:"rt_expires"`
}

type ToDo struct {
	UserID int    `json:"user_id"`
	Title  string `json:"title"`
}

type AccessDetails struct {
	AccessUuid string
	UserId     uint64
}

var Config AppConfig

var sysLog *syslog.Writer
var logger = logrus.New()

type LogPriorityInfo struct {
	Emergency int
	Alert     int
	Critical  int
	Error     int
	Warning   int
	Notice    int
	Info      int
	Debug     int
}

var LogPriority = LogPriorityInfo{
	Emergency: 0,
	Alert:     1,
	Critical:  2,
	Error:     3,
	Warning:   4,
	Notice:    5,
	Info:      6,
	Debug:     7,
}

var scheduler *gocron.Scheduler

// @title Hydra Backend API
// @description Hydra Server
func main() {
	// log파일에 출력되도록 수정.
	logger.SetOutput(&lumberjack.Logger{
		Filename:   "/var/log/hydra/hydra.log",
		MaxSize:    500,
		MaxBackups: 3,
		MaxAge:     28,
		Compress:   true,
	})
	// 기본 ASCII 포맷터 대신 Text로 로깅합니다.
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
		ForceQuote:    true,
		CallerPrettyfier: func(f *runtime.Frame) (string, string) {
			repopath := fmt.Sprintf("%s/src/github.com/bob", os.Getenv("GOPATH"))
			filename := strings.Replace(f.File, repopath, "", -1)
			return fmt.Sprintf("%s()", f.Function), fmt.Sprintf("%s:%d", filename, f.Line)
		},
	})
	logger.SetReportCaller(true)
	// 지정된 모듈에 대한 로깅 수준을 설정 -> DebugLevel 이상 부터 로깅.
	logger.SetLevel(logrus.DebugLevel)

	var e error
	sysLog, e = syslog.New(syslog.LOG_INFO|syslog.LOG_AUTHPRIV, LogProcessName)
	if e != nil {
		fmt.Println(e.Error())
		return
	}

	logger.Info("[" + LogProcessName + "] starting server")

	flag.StringVar(&Config.Port, "port", ":3030", "port for web server")
	flag.Parse()

	configor.New(&configor.Config{ENVPrefix: "APP", Silent: true}).Load(&Config, "config.yml")

	// main page path
	rootPath := "/usr/local/pspace/hydra/backend"
	// rootPath, e := os.Getwd()
	// if e != nil {
	// 	logger.Fatal(e)
	// }

	env_err := godotenv.Load(rootPath + "/.env")
	if env_err != nil {
		logger.Fatal("Error loading .env file:" + env_err.Error())
		return
	}

	// common drive access
	var err error

	connStr := fmt.Sprintf("%s:%s@(%s)/%s?multiStatements=true&parseTime=true",
		Config.DB.User, Config.DB.Password, Config.DB.Host, Config.DB.Database)
	conn, err = sqlx.Connect("mysql", connStr)
	if err != nil {
		logger.Error(err.Error())
	}

	connSysStr := fmt.Sprintf("%s:%s@(%s)/%s?multiStatements=true&parseTime=true",
		Config.DB.User, Config.DB.Password, Config.DB.Host, "Syslog")
	connSys, err = sqlx.Connect("mysql", connSysStr)
	if err != nil {
		logger.Error(err.Error())
	}

	ConnStr := fmt.Sprintf("%s:%s@(%s)/%s?multiStatements=true&parseTime=true",
		Config.DB.User, Config.DB.Password, Config.DB.Host, Config.DB.Database)
	db, err = gorm.Open(mysql.Open(ConnStr), &gorm.Config{})

	if err != nil {
		logger.Fatal(err.Error())
	}

	err = initializeDB()
	if err != nil {
		logger.Error(err.Error())
	}

	err = createAdmin()
	if err != nil {
		logger.Error(err.Error())
	}

	// initializing all cron jobs
	err = initializeScheduler()
	if err != nil {
		logger.Error(err.Error())
	}

	// start router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	cors := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	r.Use(cors.Handler)

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, rootPath+"/index.html")
	})
	fs := http.FileServer(http.Dir(rootPath + "/codebase"))
	r.Handle("/codebase/*", http.StripPrefix("/codebase/", fs))

	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"), //The url pointing to API definition
	))

	r.Post("/api/change-hostname", changeHostname)

	r.Get("/api/get-hostname", getHostname)

	r.Post("/api/create-todo", tokenAuthMiddleWare(createTodo))

	r.Route("/api", func(r chi.Router) {
		r.Post("/login", login)
		r.Post("/logout", tokenAuthMiddleWare(logout))
		r.Post("/refresh", refreshToken)
		r.Post("/change-password", changePassword)

		r.Route("/s3browser", func(r chi.Router) {
			r.Post("/session", createS3BrowserSession)

			r.Route("/buckets", func(r chi.Router) {
				r.Put("/", listBuckets)
				// r.Get("/{bucketName}", getS3BrowserBucketInfo)
				r.Post("/", createBucket)
				r.Delete("/", deleteBucket)

				r.Post("/encryption-sse", encryptBucketSSE)
				r.Delete("/encryption", deleteBucketEncryption)
				r.Put("/encryption", getBucketEncryption)

				r.Route("/acl", func(r chi.Router) {
					r.Put("/", getBucketACL)
					r.Post("/", changeBucketACL)
				})

				r.Route("/lifecycle", func(r chi.Router) {
					r.Put("/", getBucketLifecycleRules)
					r.Post("/", changeBucketLifecycleRules)
					r.Delete("/", deleteBucketLifecycleRules)
				})

				r.Route("/versioning", func(r chi.Router) {
					r.Put("/", getBucketVersioning)
					r.Post("/", changeBucketVersioning)
				})

				r.Route("/logging", func(r chi.Router) {
					r.Put("/", getBucketLogging)
					r.Post("/", changeBucketLogging)
				})

				r.Route("/tagging", func(r chi.Router) {
					r.Put("/", getBucketTagging)
					r.Post("/", changeBucketTagging)
				})
			})

			r.Route("/objects", func(r chi.Router) {
				r.Put("/", listObjects)
				r.Delete("/", deleteFile)
			})

			r.Route("/folders", func(r chi.Router) {
				r.Post("/", createFolder)
				r.Delete("/", deleteFolder)
			})

			r.Post("/upload", uploadFile)
			r.Post("/download", downloadFile)

			r.Put("/headobject", getHeadObject)
		})

		r.Route("/notifications", func(r chi.Router) {
			r.Get("/", getNotifications)
		})

		r.Route("/dashboard", func(r chi.Router) {
			r.Get("/hydrasmb", SMBPanelInfo)
			r.Get("/hydranfs", NFSPanelInfo)
			r.Get("/hydras3", S3PanelInfo)
		})

		r.Route("/storage", func(r chi.Router) {
			r.Delete("/scrubs/{id}", removeScrubRecord)
			r.Route("/pools", func(r chi.Router) {
				r.Get("/", listPools)
				r.Post("/", createPool)
				r.Get("/disks", listAvailableDisks)
				r.Get("/check/{name}", checkIfPoolNameIsAvailable)
				r.Get("/import-list", getImportList)
				r.Post("/import-list", importPoolList)

				r.Route("/{id}", func(r chi.Router) {
					r.Get("/", getPoolById)
					r.Put("/", updatePool)
					r.Delete("/", deletePool)
					r.Get("/disks", listDisksInPool)
					// datasets
					r.Get("/filesystems", getZFilesystems)
					r.Post("/filesystems", createZFilesystem)
					r.Delete("/filesystems/{filesystem_id}", deleteZFilesystem)
					r.Get("/services", checkIfDatasetsInPoolAreUsedByServices)
					// pool status
					r.Get("/status", getPoolStatus)
					r.Get("/failed-status", getFailedStatus)
					// disk groups
					r.Post("/diskgroups", addNewDiskGroup)
					r.Delete("/diskgroups", deleteDiskGroup)
					// snapshots
					r.Get("/snapshots", listSnapshots)
					// scrub
					r.Post("/scrub", createScrubScheduler)
					r.Post("/scrub-now", scrubNow)
					r.Get("/scrub", getScrubStatus)
					r.Get("/scrub-scheduler", getScrubScheduler)
					r.Get("/scrub-history", getScrubHistory)
					r.Delete("/scrub", cancelScrub)
					// export/import
					r.Post("/export", exportPool)
					r.Post("/import", importPool)
					// replace disk
					r.Post("/replace-disk", replaceDisk)
				})
			})

			r.Route("/filesystems", func(r chi.Router) {
				r.Put("/{id}", modifyZFilesystem)
				r.Get("/{id}", getZFilesystemById)

				r.Post("/check", checkIfDatasetNameAvailable)
				r.Post("/clone", cloneDatasetFromSnapshot)

				r.Get("/{id}/services", checkIfDatasetIsUsedByService)

				r.Post("/{id}/snapshots", createSnapshot)
			})

			r.Route("/snapshots", func(r chi.Router) {
				r.Get("/", listSnapshots)
				r.Get("/{id}", getSnapshotById)
				r.Delete("/{id}", deleteSnapshot)

				r.Post("/{id}/rollback", rollbackToSnapshot)

				r.Post("/check", checkSnapshotName)
			})
		})

		r.Route("/smb", func(r chi.Router) {
			r.Get("/pools", getPoolList)

			r.Get("/dataset-info/{id}", getDatasetInfo)

			r.Route("/datasets", func(r chi.Router) {
				// r.Post("/", createDataset)
				r.Get("/", getDatasetList)

				r.Get("/name-taken/{datasetName}", checkIfDatasetExists)
			})

			r.Route("/shares", func(r chi.Router) {
				r.Get("/", getShareList)
				r.Post("/", createShare)
				r.Get("/{id}", getShareById)
				r.Put("/{id}", updateShare)
				r.Delete("/{id}", deleteShare)

				r.Get("/name-taken/{shareName}", checkIfShareExists)

				r.Put("/{id}/toggle", toggleShare)

				r.Get("/{id}/users", getUsersByShare)
				r.Put("/{id}/users", setUsersByShare)
				r.Delete("/{id}/users/{userId}", deleteUserFromShare)

				r.Get("/{id}/groups", getGroupsByShare)
				r.Put("/{id}/groups", setGroupsByShare)
				r.Delete("/{id}/groups/{groupId}", deleteGroupFromShare)
			})

			r.Route("/service", func(r chi.Router) {
				r.Get("/", isSMBActive)

				r.Put("/start", startSMBService)
				r.Put("/stop", stopSMBService)
			})

			r.Route("/config", func(r chi.Router) {
				r.Get("/", getSMBConf)
				r.Put("/", updateSMBConf)
				r.Get("/default_veto_files", getDefaultVetoFiles)
			})

		})

		r.Route("/nfs", func(r chi.Router) {
			r.Route("/config", func(r chi.Router) {
				r.Get("/", getNFSConf)
				r.Put("/", updateNFSConf)
				r.Get("/service", isNFSActive)
			})

			r.Get("/export-name-taken/{export_name}", isExportNameTaken)

			r.Route("/exports", func(r chi.Router) {
				r.Get("/", getExports)
				r.Get("/{id}", getExportById)
				r.Put("/{id}", updateExportById)
				r.Post("/", createExport)
				r.Delete("/{id}", deleteExportById)

				r.Put("/{id}/toggle", toggleExport)

				r.Get("/{id}/permissions", getPermissionsByExportId)
				r.Route("/permissions", func(r chi.Router) {
					r.Post("/", addPermission)

					r.Get("/{id}", getPermissionByPermissionId)
					r.Put("/{id}", updatePermissionById)
					r.Delete("/{id}", deletePermissionById)

					r.Put("/{id}/toggle", togglePermission)
				})
			})

		})

		r.Route("/ksan", func(r chi.Router) {
			r.Route("/active", func(r chi.Router) {
				r.Get("/", isKsanActive)
			})
			r.Route("/configuration", func(r chi.Router) {
				r.Get("/", getKsanConfiguration)
				r.Post("/", addKsanConfiguration)
				r.Put("/{lifecycleDays}", updateKsanConfiguration)
				r.Route("/gw", func(r chi.Router) {
					r.Get("/", getKsanGWConfiguration)
				})
				r.Get("/check", checkKsanConfiguration)
			})
			r.Get("/diskpools", getKsanDiskPools)
			r.Get("/user/{userName}", getKsanUser)
		})

		r.Route("/s3", func(r chi.Router) {
			r.Route("/configuration", func(r chi.Router) {
				r.Get("/", getS3Configuration)
				r.Post("/", addS3Configuration)
			})
		})

		r.Route("/network", func(r chi.Router) {
			r.Put("/management-interface", setManagementInterface)
			r.Get("/interface-name-taken/{interfaceName}", interfaceNameTaken)
			r.Route("/dns", func(r chi.Router) {
				r.Get("/", getDNS)
			})

			r.Route("/interfaces", func(r chi.Router) {
				r.Get("/", getNetworkInterfaces)
				r.Get("/{interface}", getNetworkInterface)
				r.Put("/{interface}", updateNetworkInterface)

				// up / down interface
				r.Put("/control", controlInterface)

				r.Route("/vlan", func(r chi.Router) {
					r.Post("/", createNetworkInterfaceVlan)
					r.Delete("/{interface}", deleteNetworkInterfaceVlan)
				})

				r.Route("/bond", func(r chi.Router) {
					r.Post("/", createBondInterface)
					r.Delete("/{interface}", deleteBondInterface)
				})
			})
		})

		r.Route("/system", func(r chi.Router) {
			r.Route("/time", func(r chi.Router) {
				r.Get("/", getTime)
				r.Put("/", setTime)
				r.Get("/timezones", getTimeZones)
				r.Post("/reset", resetChrony)
			})

			r.Route("/log-configuration", func(r chi.Router) {
				r.Get("/", getLogConfiguration)
				r.Put("/", setLogConfiguration)
			})

			r.Get("/grafana-ip", getGrafanaIP)
		})

		r.Route("/syslog", func(r chi.Router) {
			r.Get("/", listServers)
			r.Get("/list", listLogs)
			r.Get("/list/{hostname}", listLogsByHostName)
			r.Get("/list/hosts", listAllHosts)
		})

		r.Route("/hydralog", func(r chi.Router) {
			r.Get("/", listHydraLogs)
		})

		r.Route("/users", func(r chi.Router) {
			r.Get("/", getUserList)
			r.Get("/{id}", getUser)
			r.Put("/{id}", updateUser)
			r.Post("/", createUser)
			r.Delete("/{id}", deleteUser)

			r.Get("/assigned-groups/{id}", getAssignedGroupsByUserId)

			r.Get("/s3-credentials", generateS3Credentials)
			r.Get("/{id}/s3-credentials", listS3CredentialsForUser)
			r.Post("/{id}/s3-credentials", createS3CredentialsForUser)
			r.Delete("/{id}/s3-credentials", deleteS3CredentialForUser)

			r.Get("/user-id-taken/{userId}", userIdTaken)

		})

		r.Route("/groups", func(r chi.Router) {
			r.Get("/", getGroupList)
			r.Get("/{id}", getGroup)
			r.Put("/{id}", updateGroup)
			r.Post("/", createGroup)
			r.Delete("/{id}", deleteGroup)

			r.Get("/assigned-users/{id}", getAssignedUsersByGroupId)

			r.Get("/group-id-taken/{groupId}", groupIdTaken)
		})

		r.Route("/chap-users", func(r chi.Router) {
			r.Get("/", getChapUserList)
			r.Get("/{id}", getChapUser)
			r.Post("/", addChapUser)
			r.Put("/{id}", editChapUserPassword)
			r.Delete("/{id}", deleteChapUser)

			r.Get("/chap-user-id-taken/{chapUserId}", chapUserIdTaken)
		})

		r.Route("/group-user-maps-by-user", func(r chi.Router) {
			r.Get("/{id}", getGroupUserMapListByUserId)
			r.Post("/{id}", setGroupUserMapListForUser)
		})

		r.Route("/group-user-maps-by-group", func(r chi.Router) {
			r.Get("/{id}", getGroupUserMapListByGroupId)
			r.Post("/{id}", setGroupUserMapListByGroupId)
		})
	})

	logger.Info("Starting web server at port " + Config.Port)
	http.ListenAndServe(Config.Port, r)
}

func createAdmin() error {
	query := "SELECT COUNT(*) FROM ADMIN_LOGIN_INFO"
	var count int

	err := conn.Get(&count, query)
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	if count == 0 {
		// encrypt password
		password := encryptString("admin")
		// create admin user
		query := fmt.Sprintf("INSERT INTO ADMIN_LOGIN_INFO(Username, Password) VALUES('admin', '%s')", password)
		_, err := conn.Exec(query)
		if err != nil {
			return err
		}
	}

	return nil
}

func checkScrubStatusOfPools() {
	// get list of pools
	var pools []ZPool
	query := "SELECT * FROM ZPOOLS"
	err := conn.Select(&pools, query)

	if err != nil {
		return
	}

	for _, pool := range pools {
		var scrubs []ZScrub
		query = fmt.Sprintf("SELECT * FROM ZSCRUB WHERE PoolRefId = '%s'", pool.Id)
		err := conn.Select(&scrubs, query)
		if err != nil {
			fmt.Println("Error: ", err)
			continue
		}

		if len(scrubs) == 0 {
			continue
		}

		for _, scrub := range scrubs {
			if *scrub.Status != "In Progress" {
				continue
			}

			// zpool status pool.Name
			response := subprocess.Run("sudo", "zpool", "status", pool.Name)
			if response.ExitCode != 0 {
				continue
			}

			// get scrub status
			scan := extractScan(response.StdOut)
			if scan == "" {
				continue
			}

			// save data to db
			err = saveScrubInfoToDB(scan, scrub.Id)
			if err != nil {
				fmt.Println("Error: ", err.Error())
				continue
			}
		}
	}
}

func initializeDB() error {
	// SYSTEM_CONF_USER_GROUP
	query := "SELECT COUNT(*) FROM SYSTEM_CONF_USER_GROUP"
	var count int

	err := conn.Get(&count, query)

	if err != nil {
		logger.Error(err.Error())
		return err
	}

	if count == 0 {
		// create default user group
		query := "INSERT INTO SYSTEM_CONF_USER_GROUP(uid_min, uid_max, gid_min, gid_max) VALUES(1001, 2000, 2001, 3000)"
		_, err := conn.Exec(query)

		if err != nil {
			logger.Error(err.Error())
			return err
		}
	}
	// S3_CONF
	query = "SELECT COUNT(*) FROM S3_CONF"
	err = conn.Get(&count, query)

	if err != nil {
		logger.Error(err.Error())
		return err
	}

	if count == 0 {
		// create default s3 configuration
		query := "INSERT INTO S3_CONF(Enable, HttpPort, HttpsPort, MaxThreads, MaxIdleTimeout, MaxFileSize, MaxTimeSkew) VALUES('n', 7171, 7554, 1000, 60000, 3221225472, 9000)"
		_, err := conn.Exec(query)

		if err != nil {
			logger.Error(err.Error())
			return err
		}
	}
	// SMB_GLOBAL_CONF
	query = "SELECT COUNT(*) FROM SMB_GLOBAL_CONF"
	err = conn.Get(&count, query)

	if err != nil {
		logger.Error(err.Error())
		return err
	}

	if count == 0 {
		// create default smb configuration
		query := "INSERT INTO SMB_GLOBAL_CONF(Workgroup, UseSendfile, UnixExtensions, StoreDosAttributes, SMB2Leases, LogLevel, MaxLogSize, BindInterfacesOnly) VALUES('pspace', 'y', 'n', 'n', 'n', 10, 100000, 'n')"
		_, err := conn.Exec(query)

		if err != nil {
			logger.Error(err.Error())
			return err
		}
	}

	// NFS_GLOBAL_CONF
	query = "SELECT COUNT(*) FROM NFS_GLOBAL_CONF"
	err = conn.Get(&count, query)

	if err != nil {
		logger.Error(err.Error())
		return err
	}

	if count == 0 {
		// create default nfs configuration
		query := "INSERT INTO NFS_GLOBAL_CONF(ReadPacketSize, WritePacketSize, MaximumNFSProtocol, ThreadCount, AnonuidRoot, AnonuidGuest, AnongidRoot, AnongidGuest) VALUES(8, 8, 'NFSv3', 8, 0, 65534, 100, 100)"
		_, err := conn.Exec(query)

		if err != nil {
			logger.Error(err.Error())
			return err
		}
	}

	// SYSTEM_CONF_LOG
	query = "SELECT COUNT(*) FROM SYSTEM_CONF_LOG"
	err = conn.Get(&count, query)

	if err != nil {
		logger.Error(err.Error())
		return err
	}

	if count == 0 {
		query = fmt.Sprintf("INSERT INTO SYSTEM_CONF_LOG(ProcessName, UpdateDate) VALUES('%s', NOW())", LogProcessName)

		_, err = conn.Exec(query)
		if err != nil {
			return err
		}
	}

	db.AutoMigrate(&KsanConfiguration{})

	return nil
}
