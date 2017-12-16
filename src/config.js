module.exports = function(){
    switch(process.env.NODE_ENV){
        case 'test':
            return {
              'secret': '04050405',
              'database': 'mongodb://localhost:27017/user_integration_test',
              'logsDirectory': 'logs',
              'serviceName': 'microservices_userandaccountservice',
              'tokenExpiryMinutes' : 10,
              'useSMSService' : true,
              'loginAttempt1' : 60 * 1000,
              'loginAttempt3' : 60 * 1000 * 3,
              'loginAttempt5' : 60 * 1000 * 5,
              'resetPasswordUrl': '"https://bankinstance3.monifair.com/resetpassword/',
              'resetTokenValidMinutes': 30
            };
        default:
            return {
              'secret': '04050405',
              //'database': 'mongodb://admin:test@securemongo:27017/user',
              'database': 'mongodb://bankinstance3.monifair.com:27017/user',
              'logsDirectory': 'logs',
              'serviceName': 'microservices_userandaccountservice',
              'tokenExpiryMinutes' : 1,
              'useSMSService' : false,
              'loginAttempt1' : 60 * 1000,
              'loginAttempt3' : 60 * 1000 * 3,
              'loginAttempt5' : 60 * 1000 * 5,
              'resetPasswordUrl': '"https://bankinstance3.monifair.com/resetpassword/',
              'resetTokenValidMinutes': 30
            };
    }
};
