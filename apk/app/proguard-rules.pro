# Keep app classes for release builds
-keep class in.stellarforge.billing.data.model.** { *; }
-keep class in.stellarforge.billing.printer.** { *; }

# Supabase and Ktor
-keep class io.github.jan.supabase.** { *; }
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**

# Kotlinx Serialization
-keepattributes *Annotation*,InnerClasses
-dontnote kotlinx.serialization.SerializationKt
-keepclassmembers class * {
    *** Companion;
}
-keepclasseswithmembers class * {
    kotlinx.serialization.KSerializer serializer(...);
}

# Room
-keep class androidx.room.** { *; }

# WorkManager
-keep class androidx.work.** { *; }
-keep class in.stellarforge.billing.sync.SyncWorker { *; }
