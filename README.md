# wei_app_server

Bridge between the [WEI V2 Website](https://github.com/BDE-ISATI/wei_app_v2) and the database which holds player data and challenges that can be done during the ESIR 2022 WEI (Integration Week End)

# Installing

You can deploy this server to heroku.
runtime dyno metadata MUST BE ENABLED:
`heroku labs:enable runtime-dyno-metadata -a <app name>`