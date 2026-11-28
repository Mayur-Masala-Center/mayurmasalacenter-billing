package `in`.stellarforge.billing

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import `in`.stellarforge.billing.sync.SyncScheduler
import javax.inject.Inject

@HiltAndroidApp
class BillingApp : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setWorkerFactory(workerFactory).build()

    override fun onCreate() {
        super.onCreate()
        SyncScheduler.schedulePeriodicSync(this)
    }
}
