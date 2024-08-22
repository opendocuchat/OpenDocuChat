"use server"

import { DataSource } from "@/types/database";
import { sql } from "@vercel/postgres";


export async function getDataSources() {
    const dataSources = await sql<DataSource>`SELECT * FROM data_source`;
    return dataSources.rows;
}