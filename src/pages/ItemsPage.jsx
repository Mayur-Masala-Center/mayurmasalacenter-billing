import { useState, useEffect, useRef, useCallback } from 'react'
import JsBarcode from 'jsbarcode'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

// ── Logo base64 (Mayur Masala logo, embedded, no network needed) ──
const LOGO_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABgCAYAAADW4bYkAAABUGlDQ1BpY2MAACiRfZCxS8NQEMa/VqWgdRAdHBwyiUOUkgq6OLQVRHEIVcHqlL6mqZDGR5IiBTf/gYL/gQrObhaHOjo4CKKT6ObkpOCi5XkviaQieo/jfnzvu+M4IDlucG73A6g7vltcyiubpS0l9YwEvSAM5vGcrq9K/q4/4/0+9N5Oy1m///+NwYrpMaqflBnGXR9IqMT6ns8l7xOPubQUcUuyFfKJ5HLI54FnvVggviZWWM2oEL8Qq+Ue3erhut1g0Q5y+7TpbKzJOZQTWMQOPHDYMNCEAh3ZP/yzgb+AXXI34VKfhRp86smRIieYxMtwwDADlVhDhlKTd47udxfdT421gydgoSOEuIi1lQ5wNkcna8fa1DwwMgRctbnhGoHUR5msVoHXU2C4BIzeUM+2V81q4fbpPDDwKMTbJJA6BLotIT6OhOgeU/MDcOl8AQOnYhMeBiitAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRAD/AP8A/6C9p5MAAAAHdElNRQfqCAQJICUVSIW4AABB+0lEQVR42u29d5wc13Xn+723qjqn6ckBgzDImUQiQTBnSVSmrPAkW5ZsOax3vev96Nnrtdf2e2t77bf2OunJkm1ZFk0rUBJFiWIUxUyCYABAZGAGwOQ80zlU1b37R1X39AwgmrRgk/ys+vMhBzNT3VN1zz3pd37nXOHkH9H85PVv89IgNGjh/RtAS+9ntd9ruXC50LVfiPrvF30ram8SCP97sUSapuAn8v1Xl2vDEmuxIKClS6+F9yNZ2wEakN4HKAnS9a+R3u89YQpvIwjvZ9r/KpQv4IW/9pPXv9ZLNMpSgEZ7X4VA6kaNxROM8AWmNE6+ggxayIABQiPwfo4QqLKNW6gQSER8SdbUtfYXBfIny/9voMFLvhGuQGiBVJ46CyE8mRgCpECbEgxJ5swIL//VNzj14HM4xaovXJAIJJKpU4Mc/vpD2OUKwjDQQvi/ESAEWmrMnyz/v/1LaU1lroCwFapcpTAyRTidpDQxTaitheLsHMnuTnKvDBDJa9xzM4w/8yrd11+Ocl3sTAGQBMqadKwJVXCZOXwMIxICw8CulGnashIi5ttRwPqfMYJi8SWi4T1aLNjCJabswvdcupcAlH8fUgnsQpmTX38U99wUhq3InB0ktaKHzJnzpLq7mBsZJdHThSqWqGbyRMZSDB87RWrTCpxKlXN3P4Iu2Kj5PNVSAVUsM/7A0wRbmzGUplAtse23f47Emq63mYD9oEIvEZ4XbQpfhvpCAWlJPYT1Be1fjcYPPcUSMwp+4HJpblv4MZOSAssKELMNZk8MEd24Btrb6dh9GW6hRKApSUs4RKCjDXtsErMpRVNvF3JqklAsjpJl5HwJ5/wUwZYWwm1RQqEw8e5u2m7ZTX5wnOhshmh7Go1+O/lgfYFaaIQvPE/o+mJvUaIh93Co5yK6dkFDjrIoDxFc0gTDD6C0AAxJJSSJbFmNncuicnmC7SnMdIJAXzdGZzN2NouRDCNDJlZHE25TFBm0EEELJx4CU2IPDqIcl+xcBqVdQi1pKpkcjtCIoKe7byMBL1ExrRvyxAYBaQnKAGWCNhoEq7zvteFviJolUA1mWoI2EP41l1LCWnq3JLRGWpK+d+4jvLYLVamgqjbZ8SmK2SytezZhdqSo2GVcKbALRXLDY+C6AFjJKCs/cAPB9ctwDYlybJJb+4ju2cj5pw6Qee4QpuOCAuG8zYIs3aBhwtdALZSnyQsq629b4ZtY4SeiBmjppyjKF6/0zbHwP0MjUBeiBZdie2rq96IFhDqTrPqpG5he28v08QECnWladm0isqKZlauuxbntCuaODqCKJexymXgyDgEvMk5s6SWx/MOc+PojRJIxuq7cTH5FB/ljg0wMTWI0JUArkBLhvm2QLI3WniCEr8HeynmCFLIG4wi0C7bt4tguWmuEFJiWhWWaSOEihItW3kfomjn2LYBY8JoLn38JzLNuAC1QAqRGSYF2NTgKKSQahbAMhPbTJv8ZteNvWinr4IfQ4JYdhOEZ4bmhceyZHLMHz1Aul1jzgeuI97S+nTTYF4Jw0NpECAvhP28hV2F0bI6z50YYGhpmfCzDzGyWbC6L47oEA0GSyTjN6SidHUn6+layfGU3be0pgpZEa+Xt+LqZlj7ioC7xFvU2jPAjLqk0ygCB4cV50vCFqv0t5m0uYfqWRumF0AEwQh5OpV2NYRnMjkwglUu0q5lgIuK5sbekBjdGxY1muf5kglyhyvHjg+x//jDHj54hn58kGKyyrCdIa1uUYED46J1nll0X5uZK9PfPkckaVJ04a9b2cf11e9i1cyPN6RBo20cIpf8X1UKspUWDhr9BzfYj6AWsWPsYdO0XcmEPX2xXCP+97sIeFA3rpIT2wJKyi6rayKAFAS/+eOsJWOsFf6hBC4mWLkIbSGEwM1vgiScP8ugPnmRudph1q00u39HG6tUJ2toThIJJLCuFNKIIYfihaxXXKWM7Bcp2hlwmS/+pDC+9OMHLB/OEw728+703ctNN20nEQri+NgutvG0lpJ9QKYTyV1doXnfCrBvCNT9nqlnhWuoHeHizbzQWpezCt+ouSzaCpjGXX/yZvg1462lwzdf6gZA2wYBiqcoPHzvEvfc9hGtPcP3VafZe1UNndwfBUC/SXIYw2hAyDaRBRH0ts9HaASpAAVQWZU+i3TNUKv1MjI/z9OPjPPjoNO09G/jMpz7IujVdnnYIENpFY6GlQuCCMjwT+0YE3GBWF2S6uAp0wXVLg/iah3qtdaPRyoi3qgZ7t6iFAqGQKsjpM0P83d9/m7Nnj/CO29q56YbVtLYvxwpuBGsDiA60iABWw+6XoCRSi4UFFQqtBVK4oOdR7gjKPohTeZnRoWH+4e4Bjp00+eWf/zhX79uKFC4a5W0y6YEoNVBFvFEBv95NcKlRtLeEgLW+IOMUwsFRQX7ww6N8+Uv/wNq1VT78kXWsXL6BQGgnwtwGshmBhcZEa8/n6lo0XNvxtQjWT33qpo8a2FHC5TSq+BjFzCt89/v9fPO7OT79qY9z+y07ENrx79EvvAkbaIh03+Kvt0QUrRfZIU/7HFfwzW89wdfvuYcP3dnCbTfvJJrYjRHai5A9KB3xy2cOQvtlND+nRQhfqMqzBNTSKx/U0Ib3N6ULBJFsQca6iMkuPvDehwkGT/G3X/gKTakEe/asR+gqQqsFQdcswttAwm+9NEl4oM09336Kr37tn/ilz6zgmqs3E4zcjDB3oWQMBEjtojBwhWdypWr0ZdovngvQBh6Yqeop0IJYJFr4gRMtGKFbCUjJ7bfB3OyrfOGv7qKr8z+wfHmThwyh/Ahbv8Y2fWsJ/c2DKrVG+/+JGtggBCD54VOv8JWv/BM/+4nlXHvtFYTiH0KGrgGzCUkQqYLezWsXUxtILJCeifYCXIFUElMLTAFSaL+GKpDCQUgXYSiElEhMhFR+pJpABm8mmLie931oPatW5vnKl+6lUnIRGH5hwmXBEdTgUZ+Ho996Gv0ma7DPbFBeKiKEwblzk3zxi1/j3e9u46Zbd2EGbmb8kCBonCIQj+BWHUozGeJ9q3ALeQojQ0RamkFb2LMTVK0Q7Tu2U5nNUjg7QKg5jjQM7GyeqqtJrVvJ9OFTBA0wkzGoOBSmpoltXE+8uwetU5ihG0mmxnnf+zP81n87wAvP7eba6zaj6hCpYBHicIEmv3UE/SYLWKK14flR4WC7Fe6++/t0pbL81LuuIxTeB3odk499iex37yUSDqNsm0Iowubf+12cXJFTf/D/EKmUEBhUHZvk+z5M+44tVGZnOP4n/4vQ7BABM0CpUCS671oS/+lXmXjkIXIPf59gwEC7CjvRwvrf/W3iPZ0oTATtWNYtLFsxyubtA9xz7yPs3NNHOGItZsX5lkc3mOi3mg6/ydWkBTxZCsHJE8O88OLzfOhja4m1bkbKbchwE8uvvQaJRowMEJoaIVzMYiCJtLQSVlWsmXHM2RGEFPRctQ8RjJDoW0XH5dswJsZh9BxidoKgrQiEkjSnkwRzswRnJjFmp0itXk3TmnV+nUIhlUAYK4kldnL99Ss4M3iaEycnkRh4nt1B4CIao/9GSPsnAm400Q4gUK7Jow8fZsVKg02bupDWBjAToCWB7pXolg60YaGkQM1NM/PUU2RfPoSdzYNhohC48SRGWxsaBxEWxFeuwAlE0IaFZQjmjhxk5sDzzL76KlKaXqlYGEQ6lyFDcTQevKdQuDqIEbycrRvXs7JX8MKLh9G12rM2vf/86xHay5cvMXb9NhZwDXUxvARGQD5X5vCRV7nqymZikU6kXIYWAZSQaANEOIy56XIKVpigcsj/4GGm7r+f9KYdqFgKpUVDdcir6WohqXYvRy5fBxiYk8OMfulvyM/msDZtxwEMoZCGizYUWmryuRxf++63+Md7vkHFSdOU3sDuy5o5cfwUxTIYhok0JcLQYDj+BlWL0KOfCHiRrCVCwPD4NNOzE6xfnUQYnSBaEcpCaI2ybcrSovX2O7CWr0QgsQf7qTgFmt/9HtxwGK01RrkEuSxCS8CgUikRWrGC2I23UrUCWG6Vwquv0HzllZjbt6K0QCBwCgVwHSSQz2d5+tXnePboAaqVIEZwHevW9TA4OMRDP3iF/S8O8MKLZzg9MEal6iL8Ep7QsgH8uAgR4U16vTlBVh0j95kZWEzOzGOYZZriIYSZABnwAQyJzmRAOcQ2riMxeRWZ0yfQWpG+8koiGzagTQtLAJUiTmbWgxQdF3s+RzAWo+W6fcw8ch/q7GmM1hY6r7ma0QP7cbVEoZifnERVqohAiLb2LnZftoPHnnuCqcwMyUQ7XT099PYc5O6vfJ6AYSClwHUt+tZs5uc+/QF6e5q8kqPQnpAXPWSDVr8J4MibI+BFJEivgp3JVrACimDIAhEDTFypkWiKZwYw5maRVpC2q69n7t5v4mhJy1U3IkOWn98KdClPfmSQpNY42Ry5EycJxMJEly0ntutK5gfOEN++g9jaNYj9B9AopFDYY8PY87PIRBJDGmxcuZ7v7n+Yg2eOsrr7eto7r+LX/nMIAENUUKrM5PQU99xznM994W5+6zc+RTgS9IX71oqy3iQTXSuM1qJoF6Elji1QygCCgPR+NjvPzJNPYE0MUzh9itiKPozVGwht2Ex8wxrsqVEo5VBaYNgus089iTM1Qfb4YUqvvkR1cBAnm6f1yispNzXTtG8vRiQGmWks7WAAYniQ+RdewLDLCFfR09pDKtHEQ8/9gNPnx7FC15Lu+jiJ9g+QaP8I7b2fZPuuD/ORj2ynv/8YZ8+OYxh6iTmWC9r6L6k+va01+AJVVqQSAQoFTaFkI5TtMTdsl4EHvsf0oQOEwmH67/s2wU2bSd14M4aQyHCQs48/Q8mRhFo7EFpROHmSY3/+BQoTQxjYlMZH6f/ufay47VYiN7+LxOXbmTvdz+Shw4TTnVQtA2W79H/jPsTylbTv2kFTKk1nsp1nzh/gv//dn7K+t4/5cpmZiXHCjuSmq2/iXbddQ3v7KaTxLM/uP07fqm7CYZ/z5TcZiQv88f8pPri2CD6uq7WirS2BIUPMzBVZSQ6Bg5ZB4us2kPqvv0s4FieTzSCbkvS8452gQEmT9K69dO/YTbA9Dq6mOlsinyuQNnaR/NTP4CpF2TAIdHSy8ed+kWhzisLEJCs+/XOk0s3IcAhVLpOZm8dqTmNoQbGYQ5gaGXc5r0fpP9GPPDMP40XSXStZ96l1GEacSHwVV1y5gu/dfx9DQ6P86q98mHSzF/AJ0dhC2LCf/0/RYL8Xrk56bO9Ik0y2cOxElh27ppA6jyBMx44dfq+NIoHX9lGrGQsNy/ZdgTK1F80qidKCZp9PJZRES432SXbhWDMoiPd0El/W4S+4p3UJPLrE9Nwsf3vfXbx84hX0+CRBNJGRMtePFkgLg8ePHecH934L/c73sGrVFfzSzwlu2vcIv/9Hj/GDx9Zw553X+yVF1ydvLG0n/OekfGl3g/Hf/ssnfudNM81C1/lOwUCYs2enOHrkCFdf00Ewsgap2/xWSY8C6WHBwhOYrOHX4CqX4XOjKKUIRQK+u6uZS8+X1woFhs+58rjvok6WEmgcrbnr2/fwnR9+n6n9x7htsMyusQobcxV2W9AlNT1CMvryQb73yMOUQkm27rqNdLLCyNARnnthjGuu3k04bAEL/BqhjYXuiQYZN8LZC3n00sj7x1vpNy0PXuAoeYtsSJfrr9nG+XM2J08Oot3TaFn2nlFLvJ46j6MlMDGU9FovpeTRxx/jM7/6y3zlq/+Icm2ftahRoraJvHxXIhGGge3YlEtlvwjkO0tt4lQ02ekst++4kR19lyFsm03S5XJDENDeYvVKzQ2W4oqZCR764t9y4vQogehm3nHb5VTKQzz04LMIVUOnpf9VL86Gta6RJxeaKBrJfVqwcMHbUoOp58E14WkETc1JXjk4wPmBs1yxM44V7kGKFFoYIP1IVHjtkXX+soBDR1/l4KnDnB7rx1GCvmWrCFvBhgVSSKkplco8/fwz/P9f+AJnzwyw4/KtGNJD0xAKacCWjRu5Zu819Kzo474H7metckgKjUsNiPR6IpoMg8n5HMeLNjuvfQetzQqpzvHt77zC1i2baWlJeXid9jq3PUalQPgE/Hptk6Vq7Pe4SG/jiR9Thd8kAWv/YakT2DQaKyxJNMX42lefYdUql55lAQisRIuwT8AT1B9Z6PquX7t6Dds3bqa//wyPvfI0k+V5mprSpOIpLNMEKegf6OfPv/hX3PXgN3j+uf3s2rqDnTt3IYSB43rcK8MMEAyFMIBwNMJzTz5J28wcLdKtg6u1nNtAEzckPzx5hqa+jWzYcjntLXMcfvUoh4/OcsWeywhaC2XFGodLUOO8Kr+2jN9O05hWNRjtH5Ma9KZpcA0z9nBcj0qjlUFXRyvT0yUefvgAl2+XJOMxDLkMoS0PDmwUbr1v2qCzvZMdWy5jcnSUB559hCNjpxmdm6RaKHP6xCn+8It/yuHcGYqZDJH+CWaGhnj+4CFeen4/Tz7wMC88/Twzc7M0N7cQjccwg0FOnz7B4IFXWBEIEPANveFHxwoICXCrDo+d6Wf71bfQ1d1OOjnON7/zPMFgM5s2rGyYwSF9ZreqMza9XL+2IL6ARa2lxli0Md5+JrrO4xV+pGkgANM0Wbd+BQ89eowDL5/i8i02sVgAzFYQFrK2u/2vQvjUU6WIxxLs3r4bq6R5/PHHODbbz/MnD/Dg09+n1GHjug7xp8/ziXCCtcUclWPHKR56hcTp4+gTx3ni4Yd5dP/zEAzR1dVD+7IeHnzpAOPj06RNi2it9UTg5eFomi2TgdEpjubz7Ln6HXR2mJRK/dxzzwts2riF9s40KAchfDK9BGkIhDS87gxD+ikVvkY7Hv8aUW+t+rcT8CJ40f/DjT1Ci8OnJVlBY+gofMKcru9sIQGpGRqZ4aGH93Po0DFOnZ5gcnSO9WsyhKJZDCOJEAlP833B1oh2SnhlvqBlsX3zZfS09fDS08+Ri5SJrk9hRQ2yZ+ZYdibLTZEgay3F+nCADaEA6wIGfaagz5TYI6M89dhjvPzSSyRaWthy7TUMS8HTo2MU80W6LIOAPypBoQmiabMkzx4/RTHeymU7b6S3u8iJE0d5+pkB9uzeTDyewNUu89kCQ8OzHDsxzJFj5zj86mlOnDzP6HgGpSyi8SiGqX2r1tAbpRfHLQsb/HWo0eunzS70xQgtffqRahCurqcnntA0FzK1l1RZNIBXVx0dn+X++5/kqaeeobOjyk27mrFyii9/7STRVVF+8Ve20te3jUD0FqSxAYjWO3i0n+Yo4c+/EIAJ3/rGV/mf9/8Nwa4Yuf39dMw7bJguc3s0RFraaN+f1u5FI6giyGk4V3E4Ji2qy1fQvX0bZ2fmOHjfvXy6OcWOgEBqL/AyENgoTjmC+wMRPv7ff4fbb13JiaNf5g/+8D5aWjaxZetm+geGGR0dpJibQ+sKTU0m4ZCB42qmZ2zK5QA33XgDn/zkOwkHvWdaaFpv6F9pULDXE4C9QQHrhUZX6QUmHkFfIKUEpSiWbApFRansUCjkvPf5OyMYDBKOhOsghwCKRZsXDhzj+w88TDo5z/tu6GZl0qQ0mScYEFSbwtz98CD9gwU+fOda9l2zkXhqB9K6HIweIOrnut7z+417SAPu+dbX+ZMH/5bqyAzXHZ/nuqBJSirCojESqJHYWagECY3SUNSCcVtx2nE5puDIzCytgQDvaE6x1jJpFRoDhYsCJAcriv2tbXzqD3+PPVcYvPryV/nyXc+jy5r1fc309gTo6UgQDAcJhKMEAxGEUlSEzaunBvnc5/r5vz/7K+zduwnT9BRIu8pnCQkv/aq38ojXFYC9fgFrT8Ba1IIBByXAxCQ3X+blw+d47sAhRs6fpVooUqpqKk7VL/l5L8uysCyr9nGgBY5dJhLJc/PV7VzWHaU6lsMKC1o2RAl1WUhTUCpoHnh4ku89MMLy3gTveNdKNm1cSyy5ARlYCbIPSTNIcISBUAEkgs/f9Tn+cf8DjD1xhKtnquyKhVkbNGiXfqeR716E0HWygHe3igWupzd7KqsEQy70V6rMOIqgIWkPGHSZJm1CEPGDoVerVQ73rOCj//XXuHJfiOzIY5Qms4TCHRjBLlzZzORskbMD5zl6vB8rYPDRj1/BmdOP8F/+6w9pae1i1epVbNu6liv3bGHFslbfKjp+B6Tpdz7qBd99qQTsaaM/kUsIXA0vvHCau+76Lrm5Ydb3BVjVHqK3LUEkHMQwRL3mu8hI+8JVSiAMRdxycUZzuK5D+/Y4iRVhZEDX2rl9MyoYGKryne+PcPBQhs6OKHv3drF9awstLV2EI8uQZhNCNoFoRhob+PMvfJkv3XsXXfEO9mzcxqkXDuC+eoR3xyOstgRBQR3Bqk2V8kIh1QBMyHo/uasVNpDXJjNaM+M4lBS4QlJWiqhlEpSCgargTHMTH/jMR1nRFsaxHap2kMHhWU4fOUn2zEnU7DRHpqfp2rOM3/zNW/iHL9xHQkmuua6Lc6PzHDtTYnTG4uabr+OD77uBVDyEK1x/AoFACPd1Vahet4DrVRLX8M2z4Hvf28+X7/onbtkdZ8+KBHHtgqUQEY0V8MyHXVG4JeUn/WJR3FVrqTRMQaIlSHJ5GCPuddkJpevddB6c6/lWWwmGhmyefmaKQ0ezFEoVWlsi9PYkWb48QropQmd3Cz0r381LhxJ88Ut38elPfow9uzZwdnCa3/n13+Pcg4/w4bY02wKSiPC42SAwhF/8QHkknFpz2NIY0990rpYUNeS0poyi6LqUhcGc43K2UKAQCBGMJRDKJVQp0WIYJFxFwDQZMMHYkebq96zhgYePMnxunv945xp6mjWWqyk6AQaKVb72yAgdHZv5tV/9aZrbAp5bVGbd8vwLBHxxsFv74xKE8kL8l146y+/83p/wyTvb2ehoEDbdu9OEWrxuQC8r0H4cJuoBUb2S5PcReXCjQFg1Ark3icYD6j2wTwFKCCSe0IUhUEKSKypGxyqcOV1kZNQmly9z9mwGVwg+++u309d3HeVyHIsMleppgtGVjE6s4i//9B85fP/9bLNLrAsHiZoWZdshXynTFAjQHQwQxcUUjb3/C5lsLX6otcjohmzG1oKixmOYIHCQuBrKWnnBm6OYak+w8Y5Wrru5iUcfPcd3HxmmVDZ5xw3dfOLD7UQCDjOnSsyfqmD0NvO/vnmateuu5lf//fuRlmdFRb1fWvBaBYoLBawbL9eLR+MJ12+otvgff3I3MxPP8ss3LWfq4CRbP9qFlZJoH4RYNLXoIuncooxrKbtFi4YvfnSuvfkULMnUhPRSFlcJHFczNWPzx392nFxB8K5bVxFPhDnVP0U2k+cD79nI2o3XUdb7eOqJfr71T1+n/9VXUaUKViSKHTSxx8ZY7wg2RALETbB81ySVS9I0iRmSEGBphSF0PVz058tRQFPWBhXlMu86lI0AVVcz59oczRUYMoK89+c+yDs+kKQlXcKxQ1TtMmcHzvK5v9jPe9/dzZ0f7ABHM/Z4htz5CtNrkvz534/zJ3/8GyzvafFjB90gI7GoXb7RN5sXaq+ot6JrlDceT9XgGAMhDVxHMDM3zY7taZgqkmgPYsYNz7DpxWQNLgK5Lg7xdUOK7BfK/cCsFqHXHkT44y0akXulNAIXqb2m9u4Og1//jxv5zvdGeejhU9gupFsCFIrwB3/4PD/ziRw7945y6y272bfvs4yMlsjncjSlm7FCUfrPDPDK/hcZOX2eoxOTOKUiqWiUzOQU+bEJDKeMpRykU0XWZmhI6QMfAh0KIuMhjFiS6UqVcxMTrEvEuTwYYgcmu6wQhXse5mtPJyj0tvOhX/lFdl/eS1v7t3n00QGOncygnHaEhGRviOzhHMvbAshAianpHCuWdyDcKtqfIKSp+Kmm9BietZlg/qKaF8UyhPY10Vt8iUXFrpCZzzI1k2NyqsTguWmu22lB0V0MoS70Z16Yn1+AZbFoxy3MKRMX2XPiIhiLXhjsIPyJAErT3ir51M8sI1/swbYl4TBUq3DvvcP8xedeYe2TQ7zrtmOsXtFJMhanKS6pVhQhkWLfFWu49qobKVdDVKsGrisxDYu5uSynzpxjYmKWXL5CNptFKdDaIBKJEotFMU1Jc3OSVCpCUzqJKWHwzCijJ8/hjI1RnJoiUK1glKvMmRaJ9pWkUsvQymFuNsvQeI4rdsSRfqJiWAYyKAlYAm0rXn5lgHg0QjIZJJGMEwkF0MrwvaDrd0AuLhAuFnBdc70uPENLcoUqTz+7nyd+eIDR0fNUKkVK5TLhhENX5wb0UIVysXpRN9DoEX5URC8uYrcXgTfiR4NoonZh7ZraQDvlzYdKhTU64kVqMRN++sPd7LwszfceneCLf/MiltRo5RKJWkxOFYlG42zdtoyt25rpaIuSbopiBSxsaZJOJLl2bwum1YQw0kAT6JAPdUiQDugKqDlwJ3Cdk1SqDn0r+jBuvw3HTVCt2JRLFRylCAQUyRhod5DBc09x992P4zoON+zr8CboCI/coE1BJAy7N0d4+ulv8sST38MwQzSn29m1YwvXX7+LjtY4WmkQFktLjIt9sF8f1SgkFkND8/zl579K/5mD7NnSxK4tzXS1WJjawQoq4gGT0afmcEyXjR/uAFPxZvBSfDxr8cZagpjWQBBDChxbMj1T5fxQiUxGIaUgEBDkC4rR0RITk1kcGyKhAEhBuaJwHE1HV5jm5ijdnXE6OpOEQiEsS2AFFHbVwbY11UqV2Zl5hoZzHD1RIJaMcs1VG+ns7sG0UkgRQuNQrcwxOdbPwZfOsf+lYYRZ5Wc/upYdmyMIoUAKiv0Vznxzkt5bulEBQaXqUKq4zJUEx8+WeOrgFFXdyi/8/J3s2bPeT+p0w/zoC4KsWoQryBaL/P4f/C2mO8j7t7QRKBexmgxEUBA0vAW1S5ryTJXm9RFaNsc8COnNEnCNMNE4d3LRk3kOQdYLOcI3+6LuTgSgXXCqilJFkSs4VCqaYlkwPeMwOJxleDhPpeyikDgOBEOCdDpAqeiiXWhKB4nGBalkBClNXnpxhJERm4or0drFcZRnoZTEMl1SCYPde9q4dl8zXS2Gd/+e38KZcxh6cg5bSKyQxDIllarCtTVSGriBAE8NZHnsQIXf+s1/z+Zty9Cu8gaKi4sGWV5MZgg4dniYkfP9/MZHeyk/P07bja0k1wQwwt5Aai0FWnrTybU/3ukN1S61H3+KH38Ugp8msxCOLY7KGwN0oWqT0XV9lKHQ3mDuGg/QDEE8JImnAv57BRBCE0NpTaGoqZQ1tq1xlQ+QSAgENKGwIBAWGAJMV3DLvnVMzCsmJspMTRXIFRwMQ5JOhehuj9HabhCPgawhhXjr6AowUiYr72hpSMQ9+bhVqEwqzv1gmptXJRmfmeKhB55m86YPX4BumRfLgbUQDI5OEbIgbGt0xKBpYxgZUv5UQNGQCv0Lmid9VyAQuBVFed5Bq9f91ov+lUXTajQoz8qxxE0vnjGqL0zN6lF9g/YrH36TcuHNIQGh+psdL1kvgSpDeZY6bSeQMulqN+hpD4OINLgQr6astfYGnAlRH8eP0BiqYedqH1/SvgWKgNVrEmkPUp4qs2JVnMNn5nAchWW+ZpDlf54QJJMxqi6IlEGlbOOUXKzgQj9sbS5GzaS8ESWsm0MFZx6dYehb45gOuAtcS+8+tAdu1NSzDpYo4c+bBK293NsAXKE9i6LBroJlAtJ7l+HXn7XwBjEYi0y49ssFgpoMlQZDgxIax/U+0zJ9IMa3FlLLOujh+pMEBAKtvIg+Z2rWfaKLdTe0oBQL+d3S0dYNh2v8qMWSjQxc7U23c+eqBFtijJ+ZJRlfhWGagLsoor2oiRYK1qxaRtUxmKlWEZZJYaxCUyqMomGwpq/t4o0yPX3Uwy5oTrwyjzNZJSSEx0P0n9/yi/nKBqegSWGQMAQ5wyYfrqVJBuVKBauk6DAsLCmYtWyKlldRrUpv1xsIyg64Re9zIlJQRFGMeuCJqu1QW6IKioQWJKSgZLiUwl43sCEEClVvEPVgDdc/WkHg5l2alIGSmkIEKlKh0ibJ5pA/6cc/MKPBjS3EDQ2z1WoxQX30pl5Ev/VCJI1bUlSny0TXpzn2/SJ33L4GQ3oFFPEjfXANSdSaro4mWlt7ODOSYUtLiOL5CqkN4Qvq9/9iwoHWGGHY9fFeuGOhbOfltR4ddn64Qv83xxEDOSzfpFmbk2z9UBfSFEwdrDL0gxHMagUhJAVT0fahbtI746AE0pBIAfkpmyP3TCBPZggpTVBKSgHJsg/10LI9gkZQnNacvXeC/LE5DMdfyK1xtnxkGSIAll8O9UzpQjBXnlEM/zBDbv8UgbKmFBB0vHcZHbtiWFFNekXQw7ovNttULNELcYEOLCSSS072KE1XcU2D6YpiekaxYeOyJa7mR5lo32AFwyZr1vRxYuBZ9m5NUx6dR+vUJR0AZpjQ1Rf0OuqVQLlglx0cW+NUFKNHCgSGcnQLE0sKqtolN1Hh5P2jCFdjnK/QNeUSMCwqyqbcabDlpjTplYH6c2oD8lMmI/c5xLRB0PCGsYQqmuxIhvUfS2MZBqe+M4V1apaV2sAwBPOGQ9t1KZbtipAbrzBxLIdTdujaniKxLOgBK0Jw/sUcmcOTdFYEISlRtoOTz9G5IY0I6bpVes0A4o1Ekz5TMz/p4oQtJueqNCda6O5pQte52BcVsB8sac/ZS0uTTMQ43++iA1CpuDSkVz/+qyYAG3ITVSaP5Zk+WaByrkB1xsWqgMg6tLkmAeHR8spCISpV8qcddE7RXtKETBOlFVU0TdviJDosirMO+YmKt4ksQW7IJpjRWJhon4mhlMbOVtG2opqHiWdnCVckAcPEUS52h0XH9gQTh/Oc/OtB1EAJtCa7bZ51v7ic2KoIquDijNvEqpKgT6JTWoDjorSXrujXrgW8QatXi5FA5R1CAcFsNk9rSzvxWAjXy/4WwYZm3en5M5clAldJBgdnePrZl1jdI3FsFyNuLjj6N5rZLAkqhNYgBdW8YvCRGUYenEYOlhFlhXYFrqmwoybxsjeKUAmNozSllUG2/kIv4ZYgx+8eQzw6W9+U5big58o0xWmHQ393ntzLWQLaRBoCo6KIlPCIb1pT0Qq7XdB7YwuBoGT0aBHnVIGE8GpXJVzi29PEO8NMnJzAHSzTZlsIocm+XOTY54cIb4xSOFumeiRLvORVjcuug+qQ9Fzdggx6f8uoD1XlEmqGRkYEdt6le22Mex46x4GDZ9i5fS2WiTck3ReyWYtNS2WH6ekcAwOjvPTyCV555TBt6SzvvGo5mVdm6NmT9CN28YZ33cJ8a3/EoBDYOc3pr44x9+1JkkWJJU2qhiK32qT75jbsisn03YOEHS/izZmKjpua6diZIDdWJXcuT6vfnlJSLkZfiOZ1Ec4+PEnpiXk6VK2kJrAFFCKaectBhyThlRFW3d5G9xVJnKpg9JlZglkXKTwNLEQFa3anMIOalXubqZ4sM/+daRLaJIrJ7Is55g5nUVVN2BXkpSAb1ojeAGs+2EnXzkTdR/u40eKq2Y+nxAgNTX1hJl+cp9e0uPZKkz/6g79iy5bN7Ni5mXVrV9DZniQeC3rnZVUrLo//8GXu+ebjPH/gOKOT09z5vq38wqfWExqfY2rOJt4V8st14g3dqJfvLgkwhGD8RJaZ703TVLKQElytKaclG/7dCuI9EY7+2QCpssYSkhIKY2eU5Te3oA2YPJjBGqpiCBO0pmxqmnalCDdZhJJBCEhk2RslLJFoExLXttJ6VZJwa4Bwq4k0YfxEibHHpqk8liGKhQJcpTFWhWjaGEWjCCQkvXd08PKhLNV+RdiAkDJgdZzmq5NI6SKEJtgaoHV9jFir2RD5LgQ9lypyqSWSgZRFJB2iOJzh4z/VhxWc5X/+xff5u394kMu2ruGdt13JB953LSZaY1kGV121nTVrVzI0NM6JUwMcPnyaP/6z4/z8nb0YYYPZY3naro5DQ/XxdSe8F2l8lz6329UKhPSp75LMQJmRB6dx9ueICklJu7hbw6z7ZA+RFoNKwWXshXliFQESXAW63aBzdwJhKJZdkaQ00Mr8/TNESpqAFARdyL80x5h0iHeEcbI2swN5CgNFQrOKZhHA9VtZc9KmeVcz0SYDlMaVmtgKi/Z3tTL2hVFCFZOQgMLZLHJ7lGW3prBSBnbJw6GU0gijATm75IPRvOAuP1alMFkmdWUnf/n5UwxNhPjMp97Pps2rWLGyk672NKlkBOFmH9Z19ZICISRaCbKFEr//P/6RkDjJz2xOURqdZ80nu0G+we3YmNeLBV6HKsOZeycZ+sY44VkIIZFSULYcDFujXYNSSBHaHWfNx7tJrQ2BhOkjRY7/dj/NMxpHC/KmTfxdLWz+zDKkBxThZjRnH5ll7P4J9EgFqyJBQV67uIb2oNWIJNIWQU1Wac17aVlFu+T6TLZ9dg3NawL+OQseLlDNK478/Sil786S8NOogqkptxuItMFcqUrbNU3sunOZR1e62ElbP66sfbMghGDk6RxTh4tMLQ/xpW+V+P0/+g+s7O3AkKBxveqSBrMWlmmNl+f52EwybrJ8RTv9J48jI9I7PEK/gfusa69eBIzUfiVDgtXvbSfWF2X40WkKZwo48y5VG8yUJLw8RNdVaZZd00Q4JUFplDYYP5EnP+ud1adaLVr2tbLmpzowQ94BF0oKjIRg9XtbadudYPJgjpljOapZlwAQThske2MEOyLovODc353BybuUNNhtJt03dRGIBSiXIRjxNr5WYMUMNny8i9NCMP3QNLE8BKuSypBDpezSe32aNTe0YVkNunsps44F/fVW0tUYQUnJhUgiSkd7GqEFytY1vlRDFF2nYfr0Dy1xbcnE2DQtTRK36BJOBhbVaS+oz14kDahBjvXivKjNb/YjwSB07InTtjVKccahlAHXBiOmibcahBMGUmiPMSpAaEXbmgjlO9uJNwdpuzxJsjeAaQmU9vnQyh+XLzXJ3gCpnmbcW5o97FFCaVox8UqWyccnyB8vEZ31nr2iFG5BM3TfCEOPjBFfHiS5KUbb1hSJ3iBGEIJpg/U/283QxihTL85Tna+SXhahc18z6XURDAsWSDyNdW1xAaulcc+L10o+LoDGPc2x4iZOtUQiFGR2epzMbJ5op4GWLo3lFRP/4Ipah4DnIBXFQoWRwWHed3OUzHiB5lVRvx9qYdi2F0Qt3N5FMRB94UOIhpKeUBozCIlui2SPR+5WEk8gPnpV35BC07E5RvvmmOcpDHzL4t2T8hl6NS+ifcBfBL1jVueOlTn+pWHKhwvEK9AqJFXDIJsAo8lA46CnbWKjIM5UmXgqx0j7JE1XpFj1jlZSy4NYMcGqG5vouTqFaysCIYk0pMemuMjzi4swIBbXr8WPznkXzthrOO7H+3+sxcIqVWmPGzhugcGRWbq70otQM1+DlyarHlNidGyGfGGannQXzvEska6mxjDO40dJUSd9XTTc83ZAHW/VFynK13lNeN0EwmdiCt1oLUTjsYN+7uud7HXBmQdCNBxKsxBe5Cdsjn5hkMDBCs0igGUo8splJiqQfSma1wTo3hNDuy5jj05RfDJDU8VEjShK35rhyKs51vxsDy274ggJgYCAgD9YvDZWYgl1STQOHb6IrRaNp7G8Zmzqnx+h/KO7BATSXo6fEJLOdoujxwa4cuc6WDJS0VxoBKN+KheYDPRPYhkuCWmRdTSxZhPhesfBaFHvbvQUfmGQPhdAraLhYBwtLgy+GsokosFnLeVg1Xa9VI0pWOPXJWMhGjaT1FDNuJQmy4RQXhEDsIQglXPRB6coHFdMpTvZcmcXLX0RjskhCg/NERMmUSS541VO3jtOYl2UUMrwpkoIGhrRFzMbay2u9c14EQ3QQl88K2koMuiGU97qvcYajJDA6gpRGi+weU2E8wPncFUZWes8qcumLoqF0rbQMJ8rIKTALSqMiIEZEfW5FnXKqn/n6mK+pEHj9JJxUV6pcakYFmSkL7aVG66pf2atbKc837vw+Yv/c4H48jCrP9LD/HKTacMh47jYSmNo5SG4nQHSfV5DW6DJoOnKNPmQpqgUUwEbZ0OA3mtbCEZkXRHEEnPVOHWh1pzeSEEWPp2mvhHE4jL0Ra2g34WpfRckDF8JTImMWlRyNsl4mHypiqMajuXz1+eCgr/WEiEFXb1pCiVFEUW56jJ+OE/Tughm0KdcS0D5U9YtfVFBLIokGiMG/wLZwBqvGbO6KdOLe2/qbNnGz9WNNIMfVcn3Fte0YPntzTRtSjB9JEtpvIxTdEBCrClA284UqfUhtKHRLnRsiVL8RAfurEPrygjN2xJEOyx/0sDFXKf2T4tpiEf0hUQDUcOKxWucWVz7twJs7bE3Te965TNHixMViv0FwqtSnNw/Tmf3ZkzTQuMuKhcuId0t+NNsqcLv/79fws6e4MPXdRPKVjFNl7ClMIXAlaANiV10Sa0Lk94QrbM0lqZJ3vkYCwf/1LrlpFos4PpAEr8bYukZkVroBbNTa4QXDXzqJQdF1WNYnx3hGF6wZfgxnG17V1m+VqiG8EcIn3PtgGFKbOlJzKhP8V/qOPXCqQS1+1uIkbwAkHrC4sUKddcoLqj3C8Cechh6ZAqlBcG4hTQkBA2v8zGvEUGLJ85lefJgld/+7f/E+g3doJ3XEDAaraR3b6ZmfDjLFz5/DydPH2Lnhjjb10Vpa5ZEoxaGKYiHBBNPzGI0SVa/qxVtqEXmSojGSGLBvFZs0Jj1bn2hNNJQWEZNE/Ri7a+5oBq+WwWnoOqCqwm5pl1+LaMedC08mx/2GP7vncYQ349FFChZj8PrExVkTGKafnOHzwwRF0kXhPR2qeMIXNfvo/bbUYVwCJpi4Ui7eiS1BP71D0vNnykzcM8kvbd2UAoKSkUoOw75nOb4+QrPHZvDMtr49M++n8svW+dtGKFfS4Opk9GEhyBSKru89PJpHn/qZfrP9OOqHKGwwKmU+KVPL6flVBFHaFbe0YIyPQJbHXG5iMXUQnLkWI77vjtOtCWGtiThgKCnLUxzk0l3V4D2tEHI0h4vuOHErxpgcvzZWU7+YAqrIghVvCCvYoLlaKpoHFN4YxJcjeUIXBOU1AQqAtdvFA8gKEmFCHpjgB2/iB92QNgaxycFWoDTZHD5h7ppXRutB0xCL6bqIj2hTs0qBkZLDI6VmZnVuBpc2yE3luOdt7dz+WWJ+hE9umFzCb0ACGk8AZf6KwzdP0P7+7v5s68NcG7ARiuB1HG6ly/jiqsuZ9/uLTS1RPzzhf1g7zUZHTRwvTSEQyZX79vE3is2ks0VmZ7OMztf5P/70y8xOlqhxQEdaPAZYsG/6IaIWPuIllCa5b1RVqyM8/jhChM6wOZNfSSja3jy4CsUnhpmW2+Eqy9LsGZZAKMWjDRMDUu2hOjqbSJ/1qHy0iSioimGJOGSjVgXJ5AK0LwiQubIHIVDOTqubyM7USZ/Yp7Ihmbsc1mwBK03tJM5lac8UibSlyDSGyH34jTu+Tzu8igSQXE4T8ednSRbgw1JW4NP1eBqg/7BKk+/muHQ6QrDc4qqkN5Q8gqkjTJ714VZuTKKVGphgIwSi0JsfREMQStFqSQ5frzEHXd8kD0719OUStKUChMIePVtrdzGSORH5cFLEvMGF6OVi5SQTIZoSsRwHEFXRxPTU1PoYJBqxanhIx74IHSdq+V1pXsP4bjg2JqSrVi7uZXDZ6ewnTjNbR0M5fKMVErMFgyGjtgc6J/kXZfFufXKBKGQR2rTUoAD7rRD/sg8meEqYduFtjCi6oAysDpCFPrncaMS0wEdl0xlS4TmHOLpELENTVTOzhNe3YywDZyhHIYh0YMZ5gplCtkyLZZJfEcTuUMZzLYgfbe2EUx7i1njVSvpBVTVquCH+7N855kcg3lJVQikESEWtqhkisyO5VixNsbWba04LhQrAjOgMeTiIbTe5L4FtyAQuK7C1ZpKRWFictmWtWzYuAzXcT3oVrmN6f9FQZPXPauydjizwkFIQXNLC4dOnuWG25opHBinOq8ItDSOQ/BXwp/ip1zBkUMZvv/IOOcymlIgRLypl+uvu5K8W+Splw8wny8gMLENmKgG+PpTFfK5KT54eyuBgHf2UW66ypF/GCRwzqGlOUYuUqXj6lamnp2CmGD1dc2cPZ9j+qlp5M4WIldHmTo4izXiELosiTtfwLC9A+344TjxcIDInjamnhoibMYwYhEcUUFZASoTJeJbYsQ6TI916VNxtW9SlZI8+PgcX32yQMYIUjWUPyipStF2kaZBqquF03Ml/vLbY8RFka6I5KbrWtmxI4kldZ1Y15jzC0A4gtyYTTAdYmiijHYjpNMJVNVuKLDzzxYF3sCUHT9PFg7SFCSSab71nf00dVgsiweYP5slYAUQhunvTOmfIeXZI4kgHDKJRSPEozFS8RDtLU2Y0uTIsQGmshNoqTGEIGKaxCIRAsEULzw7QnPcoK83znzGpZiTqBmb7HiBonDofVc7kb4Qwy9M0XV9C33vaKGqFDPHczhBg5Y9CVKtEebHcrRd18HE+QyRpMWKW9rJ9GcplG1iu2K0X9dCckOEwYNTtGxPoSxBZizHmg900rIuWh/ENjmnyRc1kXCAlw7m+Yu/HyHQuoJAzDtFDUejtAekkLeRs3mWxSw29UbZ1tfEltVx1q6MEg9JhNuQPvi9NaoisLOaqeN5Zs9UcLqb+dw9A2y/ci83Xb9joSerwcS+1iiH19nhrxdwau2gTYV2w3zvu/v567/5MjfuinHt6lbiquQFWqYiFDGRQYlekgMKYaCVoFp1KRU0pwfKPHZ4lnOWhdWdIhgMY2kDXbQpzhY5fOAsvS2K229axqmBPFbA4OPv7KEzplG4dPdFyM1VmRks0r0lSThhUM26nHxkimrZZfWNrZQyNtU5RduaOMMn52lqD9PUG2LicI7MeJGeHSlinSHyk1VGj+fpWhcnM13GKTt0boljWRJDC470l/j8XaMUszYbVod57sAUL58os2XHRpLdUURYYNsOhUqV6kSOnmyRnT1Btm2M05Q2CIYspFmDEnWdXyUkSGEgBdhVl0pRAAHOFmz+8ZFhupZt5bP/+WO0pGMNEbd+XZWqNzZlp/bh0kHoAI5WPL//KHfd9SDz04Ns3GCxpS9N0oqQCEM8KbCsBahNaUHFdnAcr97rOTMXETZ4+NUczw3YhBMp5sezTA7OMHJ2nELGJpgw6FnbyZpNvbS0JDAyg/y7j7XTt9JC2a6XiRk+EFCr5DheZCtkQ1rjKq+HV3rXyYUJoB5xXYuFSoVP41V+e/f4hOaP/rqfo8NBzJDJ5Ngko2cmKWccookInSvbaV/WQqojTrmQY32oxIf2dRIIaGwbv81CYVmCoGUspJBCUK1oinlNtiAo2A5DU3OcOFcgU4hx1fXX8YH37KUpHvZTLdUQTIl/BQE34olSIaVBNutw+MgAL750mJHBEaZnskhZIhz0SpHec2hcpSiWqhhmENMMeAS4chnTLLPzqj6eOTDDwUPTTE3OUipUMSyT3r4uute1sXJTL5s3ryMUCvPD+58kYZ/llz/Ry6plFmjlR6WNsGhDO0DNXamLoEb19LA+7qtONBfeGFyGpxVfuGuI/SccyrZGGpJEa5JKtkJmMMP50xOUHZtA2GLFqlY2rI3znpu7Obx/kOExh0AwCgiqdgXt2kSjAUS9VQXKJZtqVVB1QiSTCXp62ti0cQN7dm2gs6sZIW2/gO8PwGk4ZfUSCpgGOuYSxoIQCClRrqZqu+QLVXL5EsViBcdxGgoGnlkJBoOYpqfBlarDKy8f46GHnuT0mfOc6p+g6kAkHmbL3o2s2NTD2o2r6O7swK6Ueen4q/SfG6Y4laEv5vKz7+tk59YYhqHqY5EaYNzXDELqVZ6GiQIL7kSgleTY6TJ/961xDo7ZBNNxz8fO2ThOlVA0QjgSIztV4MSLZ8jM5gkFLLZtaiUZj3HZZZdz6+1XkW5OIAHbtqlUqotyohp4EwqGiEZCJBIRwmEDy4cmFw7wbHiyN0AiuAQHRNdMt1xYNr9Lb3EJg3o338I7FZoACMnY6BQPPPACf/+V73Po1dOEkyGuf89V3HDHXiLJMKf6+znZP8BMZtYzm8JAZ6vES3nee3Ur77i+lZZm7Vd5FoO8jYD/ggESDVCiXlzeFIK5LDzy1DTfemSaGRlGpgIow8PLgtqCXAU7byOsIFKZHHvmGJmZHL29Pdxx214+8L4b2Lptld/PVfUnDAm/ab1hgEWDWdFa+ppawzlf3yys13pdgpH+NajJWfwzV9SLA1roC/W+3m5qA5KuzjSf/NQ7KVSqHDs+QClb4cWnD9G+rJ2KVeDc+HkqygVhIpUCXEgaZEMxvvLkPC8ez/Du61q5bGuCdMpA6hr9aHFzXL39Fl0vM9ZGFCsEmSIcOVbgOz+Y4JXhCqTDyJCJVl6zmxJQFmXMhEUsHiU/WuTMkXPMZwoIQ/Ke91zFb/3GJwkFNErbaEcuqrih9CIaTK0L0VsYl8VDTn78ee2X8MwGseRoAr/7rz5Ndqn7a8j9pI1WEsNUbNrYRTwSIJMrEtHQf+gU5YgLcYE0vQlWteHauAYiIBHtBsdyLqfvmWTV0zPs25rksnVRejsDhEMG0liQbKM+C+FRfcoVl8lph4Mnizx7OMOJ4SpFEcJoD+Ga/lECfoVDoEAoXK3IZAoEbE06YjErJeFgkL1XbCIUNFCu3WDkjMWwpr7YuomLu78fk6l36Uw0Ysm0Fd0whmmpxi+YQy93cnwYVTA7X+IrX3mQcrHKrbdcRTAS5vN3f4NXRgawWoNow/HZBoa/0RVaCyLhKKqqKWcKiHKBhKHobbZY1ROltztMKgnxmIFlSVwF5bJLJqMZnShzfqLC2Zkqk3mNY0SINaVwsSlVivVigZY+zo6LUAb2TIW+eDu//PGfIhEJ8tDDz1EsFfjUp+6gJZ1AK+EHRL77EoofIeEFAeuGMxtqSiLedAEvpuLUprIveD298HB6adFYNaA4PrNTGJ7GCIUhXVCSodF5/uLvv8ELp05jNJsQkCjp+S/hCvp61nHL3tspl4s89Mz9jM2MeaesaAmOSzmXQyqBlAJTerm5MB2sYJRgNE3OLlDSNlIK1ixbzTuveR/ZUoYHnriPsZkRDyLV0isI2BpnqsrWZSv5lU9+iDV9bTRWqjyX6S4R3JKNvXSI2AURg1gUwL7pJlpcROSLv4qL795FC+BHrii/3qtRygMFurvTfPYXf5p77n2E7zz5FMWgi5EKov3peM3xFvZuu4pcPseTBx7H1Q6dHT28e+87OTZwjPHpadb3beLMwEm067B2zQZOnDlBc1OaDWu3MTI5yGPPP4SjK6QSTexYv4v54jxPPP+YLxuFdAVu1sEqwXv27OVjH3onra1RtK7UBSjFYjO76GzhC+ZI/Si3dWl5tpfIBy9lDuqLC19c5H2Lnqk21a5WlvcAeK0V6aYwn/y/3s3WDWv4p+8+xNGJYXRcIoOS8+Nn+doDd1MqlZjOTCIkVIoVDEwK+RJb1mwnFUnRu2sZ8/lZopE4XTt7eOz5hzkfOEkimUQqL9w6NzLANx/9GrlSganMtDdFr+CgMmU2tPbwkY/dxu5dGwkGBVpXGrIEuVgzF+UOggvYCxesibjkwr2EAv7ndfr1XdpQ/NV+FOkTnjUOVkBz5ZVrWb9hBc/sP8oDTzzDqfEhRrPneHBmwmuFwRvM5qLI2QVGp4cIR2J0trYjNJwdO8fm9ZuxhEHVrrB93XYGx4eJxVLMFKeYzE5y/5P3oaoO1UIFoyxY3dLGre/dw/X7ttPSEveiY11nsLFAoOMi5wiLN74mb30B/7h7o1YGkwsFbF8blHBpSga44+ZdXLVrPS8fOcWzrxzh2LnzTM/nEYZCBFxcUebZl59lvpihrItkCvMcPXWY+WKWFaVejg2fw5YOp0bOMj41hl2tQMnBLSnKZZsmK8buvg1cvWczO7dupDmVAsNG6Yp3VI5/HNDiWEL8C3pr/5WX81IEWZf0pWtmTjUsYgOBoEYdxaOcCGFSsR3GpmY4fmaQE6cGOTc6zOhMhrLtUNUVbBQGARyjjLQMwkTIFDIev1mZSKWJWzHam5Ks6Gpn3eplbN6wmu6OVkJBwzsbWDfQf4VYQoJ2F7jY4i0k3bekgBfxZpeqdmM2qRb9ysNmTVxHU6wUmcsUmJ4rkpnNMjubYWY+g2F5XY1uVeDYimQ6RktTE6lkiNbmJM3JBJFICNMyPJRNuz6pXbCIYbyIy7ykYetNOkb2bSbgJadmN4Sj9QMt/e8XDmXWi6pAnuJL79/K3w512o93nqGQCoHhdcSj6x15i/42NKR3uk7RFBcQuhvf89YR8FvPB18QcYolQbqoT5mtbYjFU2p8Qr3ytbwml0VrXjuIqzYyeUEDFz6rAXCoq2jDuIIfeZrMW8tEvwUF/M8v0mI/d7H2h38uPVusaRcghRd971tLM1/vS77t7vgNboZL9763n3AB/jc1iech10VhcAAAACh0RVh0aWNjOmNvcHlyaWdodABDb3B5cmlnaHQgQXBwbGUgSW5jLiwgMjAyMuS0v5wAAAAadEVYdGljYzpkZXNjcmlwdGlvbgBEaXNwbGF5IFAzj3m7vAAAAABJRU5ErkJggg=='

function generateBarcodeCode(name, price) {
  const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6).padEnd(4, '0')
  const priceCode = String(Math.round(price * 100)).padStart(6, '0').slice(0, 6)
  return `${clean}${priceCode}`
}

// ── Render barcode SVG → PNG data URL ─────────────────────────────
function barcodeToDataURL(code) {
  return new Promise((resolve, reject) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, code, {
      format: 'CODE128', width: 3, height: 80,
      displayValue: false, margin: 2,
      background: '#ffffff', lineColor: '#000000',
    })
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width || 300
      c.height = img.height || 80
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)))
  })
}

// ── Paper size definitions ────────────────────────────────────────
const PAPER_SIZES = {
  'A1': { w: 594, h: 841, jspdf: 'a1' },
  'A2': { w: 420, h: 594, jspdf: 'a2' },
  'A3': { w: 297, h: 420, jspdf: 'a3' },
  'A4': { w: 210, h: 297, jspdf: 'a4' },
  'A5': { w: 148, h: 210, jspdf: 'a5' },
}

// ── Gap between stickers ─────────────────────────────────────────
const GX = 2, GY = 2

function stickerFitInfo(paperKey = 'A4', lw = 50, lh = 50) {
  const paper = PAPER_SIZES[paperKey]
  const cols  = Math.floor((paper.w + GX) / (lw + GX))
  const rows  = Math.floor((paper.h + GY) / (lh + GY))
  return { cols, rows, perPage: cols * rows }
}

async function generateLabelPDF(items, paperKey = 'A4', lw = 50, lh = 50) {
  const { jsPDF } = await import('jspdf')

  const paper  = PAPER_SIZES[paperKey]
  const { cols, rows, perPage } = stickerFitInfo(paperKey, lw, lh)
  const labels = [...items]
  const doc = new jsPDF({ unit: 'mm', format: paper.jspdf })

  await new Promise((resolve) => {
    const img = new Image()
    img.onload = resolve
    img.onerror = resolve
    img.src = LOGO_B64
  })

  const topZone  = lh * 0.34
  const barcodeH = lh * 0.44
  const barcodeY = topZone
  const digitsY  = barcodeY + barcodeH + lh * 0.06
  const logoSize = Math.min(topZone * 0.85, lw * 0.28)
  const textX    = logoSize + 4

  for (let i = 0; i < labels.length; i++) {
    const item    = labels[i]
    const pagePos = i % perPage
    if (i > 0 && pagePos === 0) doc.addPage()

    const col = pagePos % cols
    const row = Math.floor(pagePos / cols)
    const x   = col * (lw + GX)
    const y   = row * (lh + GY)

    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.15)
    doc.rect(x, y, lw, lh)

    doc.addImage(LOGO_B64, 'PNG', x + 2, y + 2, logoSize, logoSize)

    const maxChars = Math.floor(lw / 3.2)
    const name = item.name.length > maxChars ? item.name.slice(0, maxChars - 1) + '…' : item.name
    doc.setFontSize(Math.max(6, Math.min(9, lw * 0.17)))
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(name, x + textX, y + topZone * 0.38)

    doc.setFontSize(Math.max(7, Math.min(11.5, lw * 0.21)))
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 130, 60)
    const displayPrice = item.display_price ?? item.price * 2
    doc.text(`Rs.${Number(displayPrice).toFixed(2)}`, x + textX, y + topZone * 0.82)

    try {
      const bc = await barcodeToDataURL(item.barcode)
      doc.addImage(bc, 'PNG', x + 0.5, y + barcodeY, lw - 1, barcodeH)
    } catch (e) {
      doc.setFontSize(6); doc.setTextColor(150)
      doc.text(item.barcode, x + lw / 2, y + barcodeY + barcodeH / 2, { align: 'center' })
    }

    doc.setFontSize(Math.max(7, Math.min(11, lw * 0.20)))
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(item.barcode, x + lw / 2, y + digitsY, { align: 'center' })
  }

  doc._labelMeta = { cols, rows, perPage }
  return doc
}

// ── Print modal ───────────────────────────────────────────────────
function PrintModal({ items, title, onClose }) {
  const toast = useToast()
  const [paperKey, setPaperKey] = useState('A4')
  const [lw, setLw]             = useState(50)
  const [lh, setLh]             = useState(50)
  const [genPDF, setGenPDF]     = useState(false)

  const lwV = Math.max(10, Math.min(200, lw || 50))
  const lhV = Math.max(10, Math.min(200, lh || 50))

  const { cols, rows, perPage } = stickerFitInfo(paperKey, lwV, lhV)

  const expandedItems = (() => {
    if (items.length === 0 || perPage === 0) return []
    const result = []
    for (let i = 0; i < perPage; i++) result.push(items[i % items.length])
    return result
  })()

  const total = expandedItems.length

  const handlePDF = async () => {
    if (perPage === 0) return toast('Sticker is too large for selected paper', 'error')
    setGenPDF(true)
    try {
      const doc = await generateLabelPDF(expandedItems, paperKey, lwV, lhV)
      const fname = items.length === 1
        ? `label-${items[0].name.replace(/\s+/g, '-').toLowerCase()}-${paperKey}.pdf`
        : `mayur-masala-labels-${paperKey}.pdf`
      doc.save(fname)
      toast(`PDF downloaded — ${total} label${total > 1 ? 's' : ''} on 1 page`)
      onClose()
    } catch (e) { toast('PDF generation failed: ' + e.message, 'error') }
    setGenPDF(false)
  }

  const dimInput = (label, val, setVal) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          className="form-input"
          type="number" min="10" max="200" value={val}
          onChange={e => setVal(parseInt(e.target.value) || 10)}
          style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1rem', padding: '6px 8px' }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>mm</span>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">🖨️ {title}</div>
        <div className="modal-subtitle">
          {items.length === 1 ? items[0].name : `${items.length} items`} — auto-fills one full page
        </div>

        {items.length > 1 && items.length <= 8 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
            {items.map(i => (
              <span key={i.id} style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 9px', fontSize: '0.72rem', fontWeight: 600 }}>
                {i.name}
              </span>
            ))}
          </div>
        )}
        {items.length > 8 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            {items.slice(0, 5).map(i => i.name).join(', ')} +{items.length - 5} more
          </div>
        )}

        {/* ── Sticker size ── */}
        <div className="form-group">
          <label className="form-label">Sticker Size</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {dimInput('Width', lw, setLw)}
            {dimInput('Height', lh, setLh)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 5 }}>
            Current: {lwV}×{lhV}mm &nbsp;·&nbsp; min 10mm, max 200mm
          </div>
        </div>

        {/* ── Paper size selector ── */}
        <div className="form-group">
          <label className="form-label">Paper Size</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.keys(PAPER_SIZES).map(key => (
              <button
                key={key}
                onClick={() => setPaperKey(key)}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 'var(--radius-sm)',
                  border: paperKey === key ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: paperKey === key ? 'var(--accent)' : 'var(--paper)',
                  color: paperKey === key ? '#fff' : 'var(--ink)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* ── Stats summary ── */}
        <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16 }}>
          {perPage === 0 ? (
            <div style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center' }}>
              ⚠️ Sticker too large for {paperKey} — reduce size or choose a bigger paper
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Stickers on page</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.05rem' }}>{total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grid ({paperKey})</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: '0.85rem' }}>{cols} cols × {rows} rows</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pages</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: '0.85rem' }}>1</span>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-primary btn-full btn-lg" onClick={handlePDF} disabled={genPDF || perPage === 0}>
            {genPDF ? '⏳ Generating PDF…' : `⬇️ Download ${paperKey} PDF`}
          </button>
          <button className="btn btn-ghost btn-full" onClick={onClose} disabled={genPDF}>Cancel</button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 10 }}>
          {paperKey} · {cols} cols × {rows} rows · {lwV}×{lhV}mm · CODE128
        </div>
      </div>
    </div>
  )
}

// ── Barcode preview card ──────────────────────────────────────────
function BarcodeImage({ code, name, price, display_price }) {
  const svgRef = useRef()
  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128', width: 2, height: 55,
          displayValue: true, fontSize: 10, margin: 5,
          background: '#ffffff', lineColor: '#0f1923',
        })
      } catch (e) {}
    }
  }, [code])
  return (
    <div className="barcode-card">
      <svg ref={svgRef} style={{ maxWidth: '100%' }} />
      <div className="barcode-name">{name}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Actual: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>₹{Number(price).toFixed(2)}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>
          Label: ₹{Number(display_price ?? price * 2).toFixed(2)}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function ItemsPage() {
  const toast = useToast()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ name: '', price: '', display_price: '' })
  const [saving, setSaving]     = useState(false)
  const [searchQ, setSearchQ]   = useState('')
  const [printTarget, setPrintTarget] = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false })
    if (error) toast('Failed to load items', 'error')
    else setItems(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleAdd = async () => {
    if (!form.name.trim() || !form.price) return toast('Please fill all fields', 'error')
    const price = parseFloat(form.price)
    if (isNaN(price) || price <= 0) return toast('Enter a valid price', 'error')
    const display_price = form.display_price ? parseFloat(form.display_price) : price * 2
    if (isNaN(display_price) || display_price <= 0) return toast('Enter a valid display price', 'error')
    setSaving(true)
    const barcode = generateBarcodeCode(form.name, price)
    const { error } = await supabase.from('items').insert({ name: form.name.trim(), price, display_price, barcode })
    if (error) {
      if (error.code === '23505') toast('Item with similar code exists, try a different name', 'error')
      else toast('Failed to save item: ' + error.message, 'error')
    } else {
      toast(`"${form.name}" added!`)
      setForm({ name: '', price: '', display_price: '' })
      setShowForm(false)
      fetchItems()
    }
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) toast('Failed to delete', 'error')
    else { toast(`"${name}" deleted`); fetchItems() }
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(searchQ.toLowerCase()) || i.barcode.includes(searchQ)
  )
  const printItems = printTarget === 'all' ? filtered : printTarget ? [printTarget] : null

  return (
    <div className="page-wide">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Items & Barcodes</h1>
          <p className="page-subtitle">PDF sticker sheet · 50×50mm · A1 / A2 / A3 / A4 / A5</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-secondary"
            onClick={() => filtered.length > 0 ? setPrintTarget('all') : toast('No items to print', 'error')}
            disabled={items.length === 0}>
            🖨️ Print All
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add</button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input className="form-input" placeholder="Search items or barcodes…"
          value={searchQ} onChange={e => setSearchQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading items…</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-title">{searchQ ? 'No items match' : 'No items yet'}</div>
          {!searchQ && <button className="btn btn-primary mt-3" onClick={() => setShowForm(true)}>+ Add First Item</button>}
        </div>
      ) : (
        <div className="barcode-grid">
          {filtered.map(item => (
            <div key={item.id} style={{ position: 'relative' }}>
              <BarcodeImage code={item.barcode} name={item.name} price={item.price} display_price={item.display_price} />
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="btn btn-dark btn-sm" style={{ padding: '4px 8px', minHeight: 30, fontSize: '0.72rem' }}
                  title="Print label" onClick={() => setPrintTarget(item)}>🖨️</button>
                <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px', minHeight: 30, fontSize: '0.72rem' }}
                  title="Delete" onClick={() => handleDelete(item.id, item.name)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-title">Add New Item</div>
            <div className="modal-subtitle">Barcode generated automatically · Display price printed on label</div>
            <div className="form-group">
              <label className="form-label">Item Name</label>
              <input className="form-input" placeholder="e.g. Basmati Rice 5kg"
                value={form.name} autoFocus
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹) — actual billing price</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="e.g. 30.00"
                value={form.price}
                onChange={e => setForm(f => ({
                  ...f,
                  price: e.target.value,
                  display_price: f._displayEdited ? f.display_price : String(parseFloat(e.target.value) * 2 || '')
                }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div className="form-group">
              <label className="form-label">Display Price (₹) — printed on label</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="Auto: 2× actual price"
                value={form.display_price}
                onChange={e => setForm(f => ({ ...f, display_price: e.target.value, _displayEdited: true }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              {form.price && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Actual ₹{parseFloat(form.price) || 0} → Label ₹{parseFloat(form.display_price) || (parseFloat(form.price) || 0) * 2}
                </div>
              )}
            </div>
            {form.name && form.price && (
              <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>Barcode preview</div>
                <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.08em' }}>
                  {generateBarcodeCode(form.name, parseFloat(form.price) || 0)}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-full" onClick={() => { setShowForm(false); setForm({ name: '', price: '', display_price: '' }) }}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={saving}>
                {saving ? 'Saving…' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {printItems && (
        <PrintModal
          items={printItems}
          title={printTarget === 'all' ? 'Print All Labels' : 'Print Label'}
          onClose={() => setPrintTarget(null)}
        />
      )}
    </div>
  )
}