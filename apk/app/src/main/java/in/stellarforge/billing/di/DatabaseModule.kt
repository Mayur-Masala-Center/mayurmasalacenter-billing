package in.stellarforge.billing.di

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import in.stellarforge.billing.data.db.AppDatabase
import in.stellarforge.billing.data.db.MIGRATION_1_2
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "stellarforge_billing.db")
            .addMigrations(MIGRATION_1_2)
            .build()

    @Provides fun provideBillDao(db: AppDatabase) = db.billDao()
    @Provides fun provideBillItemDao(db: AppDatabase) = db.billItemDao()
    @Provides fun provideItemDao(db: AppDatabase) = db.itemDao()
    @Provides fun provideShopSettingDao(db: AppDatabase) = db.shopSettingDao()
    @Provides fun provideSyncOutboxDao(db: AppDatabase) = db.syncOutboxDao()
    @Provides fun provideSyncMetaDao(db: AppDatabase) = db.syncMetaDao()
    @Provides fun provideCustomerDao(db: AppDatabase) = db.customerDao()
    @Provides fun provideUdhariLedgerDao(db: AppDatabase) = db.udhariLedgerDao()
    @Provides fun provideSalesLedgerDao(db: AppDatabase) = db.salesLedgerDao()
}
