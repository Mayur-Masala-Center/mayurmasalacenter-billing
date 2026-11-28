package in.stellarforge.billing.di

import android.content.Context
import in.stellarforge.billing.auth.AuthManager
import in.stellarforge.billing.network.SupabaseClientWrapper
import in.stellarforge.billing.util.DeviceManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDeviceManager(@ApplicationContext context: Context): DeviceManager =
        DeviceManager(context)

    @Provides
    @Singleton
    fun provideAuthManager(@ApplicationContext context: Context): AuthManager =
        AuthManager(context)

    @Provides
    @Singleton
    fun provideSupabaseClient(authManager: AuthManager): SupabaseClientWrapper =
        SupabaseClientWrapper(authManager)
}
