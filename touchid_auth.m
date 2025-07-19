#import <Foundation/Foundation.h>
#import <LocalAuthentication/LocalAuthentication.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        LAContext *context = [[LAContext alloc] init];
        NSError *error = nil;
        
        // Set the app name that appears in the Touch ID prompt
        context.localizedFallbackTitle = @"Use Password";
        
        // Set a custom app name for the authentication prompt
        NSString *appName = @"Dashboard Electron";
        
        // First try Touch ID/Face ID, then fall back to password
        LAPolicy policy = LAPolicyDeviceOwnerAuthenticationWithBiometrics;
        
        // Check if biometric authentication is available
        if (![context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error]) {
            // Fall back to device owner authentication (includes password)
            policy = LAPolicyDeviceOwnerAuthentication;
            if (![context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&error]) {
                printf("not_available\n");
                return 1;
            }
        }
        
        NSString *reason = @"Dashboard Electron wants to access recent transactions";
        if (argc > 1) {
            NSString *customReason = [NSString stringWithUTF8String:argv[1]];
            reason = [NSString stringWithFormat:@"Dashboard Electron: %@", customReason];
        }
        
        __block BOOL completed = NO;
        __block BOOL success = NO;
        
        [context evaluatePolicy:policy
                localizedReason:reason
                          reply:^(BOOL authSuccess, NSError *authError) {
            success = authSuccess;
            completed = YES;
            
            if (authError) {
                switch (authError.code) {
                    case LAErrorUserCancel:
                        printf("cancelled\n");
                        break;
                    case LAErrorBiometryNotAvailable:
                        printf("not_available\n");
                        break;
                    case LAErrorBiometryNotEnrolled:
                        printf("not_enrolled\n");
                        break;
                    case LAErrorUserFallback:
                        printf("password_fallback\n");
                        break;
                    default:
                        printf("failed\n");
                        break;
                }
            } else if (authSuccess) {
                // Determine which method was used
                if (policy == LAPolicyDeviceOwnerAuthenticationWithBiometrics) {
                    printf("success_touchid\n");
                } else {
                    printf("success_password\n");
                }
            } else {
                printf("failed\n");
            }
        }];
        
        // Wait for completion
        while (!completed) {
            [[NSRunLoop currentRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
        }
    }
    return 0;
}